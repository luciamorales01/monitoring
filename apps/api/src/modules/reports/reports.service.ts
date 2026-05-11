import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IncidentStatus, MonitorStatus, Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import { buildAccessibleMonitorWhere, canAccessAllOrganizationMonitors, type AuthenticatedUser } from '../../common/monitor-access-scope';
import { PrismaService } from '../../database/prisma/prisma.service';

type ReportRange = '24h' | '7d' | '30d' | 'custom';
type ReportFormat = 'csv' | 'pdf' | 'xlsx';

type ExportReportParams = {
  user: AuthenticatedUser;
  range: ReportRange;
  format: ReportFormat;
  monitorId?: number;
  sectionId?: number;
  from?: string;
  to?: string;
};

type ReportRow = {
  monitor: {
    id: number;
    name: string;
    target: string;
    type?: string;
    currentStatus: string;
    isActive: boolean;
  };
  uptimePercent: number;
  slaPercent?: number;
  averageResponseTimeMs: number;
  incidents: number;
  openIncidents: number;
  checks: number;
  downChecks?: number;
  estimatedDowntimeSeconds?: number;
  lastDowntime: string | null;
};

type ReportTotals = {
  averageUptimePercent: number;
  averageResponseTimeMs: number;
  incidents: number;
  checks: number;
  monitors: number;
  estimatedDowntimeSeconds: number;
};

function getPresetRangeStart(range: Exclude<ReportRange, 'custom'>) {
  const now = new Date();
  const hours = range === '24h' ? 24 : range === '30d' ? 24 * 30 : 24 * 7;
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

function getRangeWindow(range: ReportRange, from?: string, to?: string) {
  if (range !== 'custom') {
    return { from: getPresetRangeStart(range), to: new Date() };
  }

  if (!from || !to) {
    throw new BadRequestException('El rango personalizado requiere from y to.');
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new BadRequestException('Las fechas del rango personalizado no son válidas.');
  }

  if (fromDate >= toDate) {
    throw new BadRequestException('La fecha inicial debe ser anterior a la final.');
  }

  const maxRangeMs = 90 * 24 * 60 * 60 * 1000;
  if (toDate.getTime() - fromDate.getTime() > maxRangeMs) {
    throw new BadRequestException('El rango personalizado no puede superar 90 días.');
  }

  return { from: fromDate, to: toDate };
}

function getRangeLabel(range: ReportRange, from?: Date, to?: Date) {
  if (range === 'custom' && from && to) {
    return `${from.toISOString().slice(0, 10)} - ${to.toISOString().slice(0, 10)}`;
  }

  if (range === '24h') return 'Ultimas 24 horas';
  if (range === '30d') return 'Ultimos 30 dias';
  return 'Ultimos 7 dias';
}

function getDowntimeSeconds(rangeSeconds: number, checks: number, downChecks: number) {
  if (checks <= 0 || downChecks <= 0) return 0;
  return Math.round((downChecks / checks) * rangeSeconds);
}

function csvEscape(value: unknown) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function formatSeconds(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

function getRangeSeconds(from: Date, to: Date) {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 1000));
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    user: AuthenticatedUser,
    range: ReportRange,
    monitorId?: number,
    sectionId?: number,
    fromInput?: string,
    toInput?: string,
  ) {
    const organizationId = user.organizationId;
    const { from, to } = getRangeWindow(range, fromInput, toInput);
    const rangeSeconds = getRangeSeconds(from, to);

    if (monitorId) {
      const monitor = await this.prisma.monitor.findFirst({
        where: { id: monitorId, organizationId },
        include: {
          sections: {
            include: { section: { include: { members: true } } },
          },
        },
      });

      if (!monitor) {
        throw new NotFoundException('Monitor no encontrado');
      }

      if (!this.canAccessMonitor(monitor, user)) {
        throw new ForbiddenException('No tienes acceso a los informes de este monitor.');
      }
    }

    if (sectionId) {
      const section = await this.prisma.section.findFirst({
        where: {
          id: sectionId,
          organizationId,
          ...(this.canAccessAllMonitors(user)
            ? {}
            : {
                members: {
                  some: { userId: user.userId },
                },
              }),
        },
        select: { id: true },
      });

      if (!section) {
        throw new NotFoundException('Seccion no encontrada');
      }
    }

    const monitors = await this.prisma.monitor.findMany({
      where: this.buildMonitorWhere(user, monitorId, sectionId),
      include: {
        checkResults: {
          where: { checkedAt: { gte: from, lte: to } },
          orderBy: { checkedAt: 'asc' },
          select: {
            status: true,
            responseTimeMs: true,
            checkedAt: true,
          },
        },
        incidents: {
          where: { startedAt: { gte: from, lte: to } },
          orderBy: { startedAt: 'desc' },
          select: {
            id: true,
            status: true,
            startedAt: true,
            resolvedAt: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const rows = monitors.map((monitor) => {
      const checks = monitor.checkResults;
      const upChecks = checks.filter((check) => check.status === MonitorStatus.UP).length;
      const downChecks = checks.filter((check) => check.status === MonitorStatus.DOWN).length;
      const checksWithResponse = checks.filter((check) => typeof check.responseTimeMs === 'number');
      const averageResponseTimeMs = checksWithResponse.length
        ? Math.round(
            checksWithResponse.reduce((sum, check) => sum + (check.responseTimeMs ?? 0), 0) /
              checksWithResponse.length,
          )
        : monitor.lastResponseTime ?? 0;

      const uptimePercent = checks.length
        ? Number(((upChecks / checks.length) * 100).toFixed(2))
        : monitor.isActive && monitor.currentStatus === MonitorStatus.UP
          ? 100
          : 0;

      const estimatedDowntimeSeconds = getDowntimeSeconds(rangeSeconds, checks.length, downChecks);

      const lastDowntime = checks
        .slice()
        .reverse()
        .find((check) => check.status === MonitorStatus.DOWN)?.checkedAt;

      return {
        monitor: {
          id: monitor.id,
          name: monitor.name,
          target: monitor.target,
          type: monitor.type,
          currentStatus: monitor.currentStatus,
          isActive: monitor.isActive,
        },
        uptimePercent,
        slaPercent: uptimePercent,
        averageResponseTimeMs,
        incidents: monitor.incidents.length,
        openIncidents: monitor.incidents.filter((incident) => incident.status === IncidentStatus.OPEN).length,
        checks: checks.length,
        downChecks,
        estimatedDowntimeSeconds,
        lastDowntime: lastDowntime?.toISOString() ?? null,
      };
    });

    const checks = rows.reduce((sum, row) => sum + row.checks, 0);
    const incidents = rows.reduce((sum, row) => sum + row.incidents, 0);
    const estimatedDowntimeSeconds = rows.reduce((sum, row) => sum + row.estimatedDowntimeSeconds, 0);
    const averageUptimePercent = rows.length
      ? Number((rows.reduce((sum, row) => sum + row.uptimePercent, 0) / rows.length).toFixed(2))
      : 0;
    const rowsWithResponse = rows.filter((row) => row.averageResponseTimeMs > 0);
    const averageResponseTimeMs = rowsWithResponse.length
      ? Math.round(
          rowsWithResponse.reduce((sum, row) => sum + row.averageResponseTimeMs, 0) /
            rowsWithResponse.length,
        )
      : 0;

    return {
      range,
      from: from.toISOString(),
      to: to.toISOString(),
      selectedMonitorId: monitorId ?? null,
      selectedSectionId: sectionId ?? null,
      totals: {
        averageUptimePercent,
        averageResponseTimeMs,
        incidents,
        checks,
        monitors: rows.length,
        estimatedDowntimeSeconds,
      },
      rows,
    };
  }

  async exportReport(params: ExportReportParams) {
    const summary = await this.getSummary(
      params.user,
      params.range,
      params.monitorId,
      params.sectionId,
      params.from,
      params.to,
    );
    let suffix = 'todos-los-monitores';

    if (params.monitorId && summary.rows[0]) {
      suffix = this.slugify(summary.rows[0].monitor.name);
    } else if (params.sectionId) {
      const section = await this.prisma.section.findUnique({
        where: { id: params.sectionId },
        select: { name: true },
      });
      suffix = section ? this.slugify(section.name) : `seccion-${params.sectionId}`;
    }

    if (params.format === 'xlsx') {
      return {
        filename: `informe-monitoring-${params.range}-${suffix}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: await this.buildExcel(
          summary.rows,
          summary.range,
          new Date(summary.from),
          new Date(summary.to),
          summary.totals,
        ),
      };
    }

    if (params.format === 'pdf') {
      return {
        filename: `informe-monitoring-${params.range}-${suffix}.pdf`,
        contentType: 'application/pdf',
        buffer: this.buildPdf(
          summary.rows,
          summary.range,
          new Date(summary.from),
          new Date(summary.to),
          summary.totals,
        ),
      };
    }

    return {
      filename: `informe-monitoring-${params.range}-${suffix}.csv`,
      contentType: 'text/csv; charset=utf-8',
      buffer: Buffer.from(this.buildCsv(summary.rows), 'utf8'),
    };
  }

  private buildCsv(rows: ReportRow[]) {
    const header = [
      'Monitor',
      'URL',
      'Tipo',
      'Estado',
      'Uptime',
      'SLA',
      'Downtime estimado',
      'Tiempo medio',
      'Incidencias',
      'Checks',
      'Ultima caida',
    ];

    const lines = rows.map((row) => [
      row.monitor.name,
      row.monitor.target,
      row.monitor.type ?? '-',
      row.monitor.currentStatus,
      `${row.uptimePercent}%`,
      `${row.slaPercent ?? row.uptimePercent}%`,
      formatSeconds(row.estimatedDowntimeSeconds ?? 0),
      `${row.averageResponseTimeMs} ms`,
      row.incidents,
      row.checks,
      row.lastDowntime ?? 'Sin caidas recientes',
    ]);

    return [header, ...lines].map((line) => line.map(csvEscape).join(',')).join('\n');
  }

  private async buildExcel(
    rows: ReportRow[],
    range: ReportRange,
    from: Date,
    to: Date,
    totals: ReportTotals,
  ) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Monitoring';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Informe');
    sheet.addRow(['Informe de monitorizacion', getRangeLabel(range, from, to)]);
    sheet.addRow([
      'Monitores',
      totals.monitors,
      'Uptime medio',
      `${totals.averageUptimePercent}%`,
      'Respuesta media',
      `${totals.averageResponseTimeMs} ms`,
      'Incidencias',
      totals.incidents,
    ]);
    sheet.addRow([]);
    const headerRow = sheet.addRow([
      'Monitor',
      'URL',
      'Tipo',
      'Estado',
      'Uptime',
      'SLA',
      'Downtime estimado',
      'Tiempo medio',
      'Incidencias',
      'Checks',
      'Ultima caida',
    ]);
    sheet.views = [{ state: 'frozen', ySplit: 4 }];
    sheet.mergeCells('A1:K1');
    sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    sheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    };
    sheet.getCell('A1').alignment = { vertical: 'middle' };
    sheet.getRow(1).height = 26;
    sheet.getRow(2).font = { bold: true, color: { argb: 'FF0F172A' } };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' },
    };
    headerRow.alignment = { vertical: 'middle' };

    rows.forEach((row) => {
      const dataRow = sheet.addRow([
        row.monitor.name,
        row.monitor.target,
        row.monitor.type ?? '-',
        row.monitor.currentStatus,
        `${row.uptimePercent}%`,
        `${row.slaPercent ?? row.uptimePercent}%`,
        formatSeconds(row.estimatedDowntimeSeconds ?? 0),
        `${row.averageResponseTimeMs} ms`,
        row.incidents,
        row.checks,
        row.lastDowntime ?? 'Sin caidas recientes',
      ]);
      const isDown = row.monitor.currentStatus === 'DOWN';
      dataRow.getCell(4).font = {
        bold: true,
        color: { argb: isDown ? 'FFDC2626' : 'FF16A34A' },
      };
      dataRow.getCell(5).font = {
        bold: true,
        color: { argb: row.uptimePercent < 99 ? 'FFD97706' : 'FF16A34A' },
      };
    });

    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    });

    sheet.columns.forEach((column) => {
      let width = 14;
      column.eachCell({ includeEmpty: true }, (cell) => {
        width = Math.max(width, String(cell.value ?? '').length + 2);
      });
      column.width = Math.min(width, 48);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private buildPdf(
    rows: ReportRow[],
    range: ReportRange,
    from: Date,
    to: Date,
    totals: ReportTotals,
  ) {
    const title = `Informe Monitoring - ${getRangeLabel(range, from, to)}`;
    const lines = [
      title,
      '',
      `Monitores: ${totals.monitors} | Uptime medio: ${totals.averageUptimePercent}% | Respuesta media: ${totals.averageResponseTimeMs} ms`,
      `Incidencias: ${totals.incidents} | Checks: ${totals.checks} | Downtime estimado: ${formatSeconds(totals.estimatedDowntimeSeconds)}`,
      '',
      'Monitor                         Estado     Uptime    Resp.    Inc. Checks',
      '--------------------------------------------------------------------------',
      ...rows.flatMap((row) => [
        `${row.monitor.name.slice(0, 30).padEnd(31)} ${row.monitor.currentStatus.padEnd(9)} ${String(`${row.uptimePercent}%`).padEnd(9)} ${String(`${row.averageResponseTimeMs} ms`).padEnd(8)} ${String(row.incidents).padEnd(4)} ${row.checks}`,
        `  ${row.monitor.target}`,
        `  Downtime: ${formatSeconds(row.estimatedDowntimeSeconds ?? 0)} | Ultima caida: ${row.lastDowntime ?? 'Sin caidas recientes'}`,
        '',
      ]),
      `Generado: ${new Date().toISOString()}`,
    ];

    return this.buildSimplePdf(lines, {
      titleLines: 1,
      headerLines: 6,
    });
  }

  private buildSimplePdf(
    lines: string[],
    options: { titleLines: number; headerLines: number },
  ) {
    const safeLines = lines.map((line) =>
      line
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, '')
        .replace(/[\\()]/g, (match) => `\\${match}`),
    );

    const content = [
      'BT',
      '/F1 18 Tf',
      '50 790 Td',
      ...safeLines.flatMap((line, index) => [
        index === 0 ? '' : '0 -16 Td',
        index === options.titleLines ? '/F1 10 Tf' : '',
        index === options.headerLines ? '/F2 9 Tf' : '',
        `(${line}) Tj`,
      ]),
      'ET',
    ].filter(Boolean).join('\n');

    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /Contents 5 0 R >>\nendobj',
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
      `5 0 obj\n<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream\nendobj`,
      '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj',
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf));
      pdf += `${object}\n`;
    }
    const xrefOffset = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, 'utf8');
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'monitor';
  }

  private buildMonitorWhere(
    user: AuthenticatedUser,
    monitorId?: number,
    sectionId?: number,
  ): Prisma.MonitorWhereInput {
    const filters: Prisma.MonitorWhereInput[] = [buildAccessibleMonitorWhere(user)];

    if (monitorId) {
      filters.push({ id: monitorId });
    }

    if (sectionId) {
      filters.push({
        sections: {
          some: { sectionId },
        },
      });
    }

    return filters.length === 1 ? filters[0] : { AND: filters };
  }

  private canAccessMonitor(
    monitor: {
      organizationId: number;
      sections?: { section: { members: { userId: number }[] } }[];
    },
    user: AuthenticatedUser,
  ) {
    if (monitor.organizationId !== user.organizationId) return false;
    if (this.canAccessAllMonitors(user)) return true;
    return (
      monitor.sections?.some(({ section }) =>
        section.members.some((member) => member.userId === user.userId),
      ) ?? false
    );
  }

  private canAccessAllMonitors(user: AuthenticatedUser) {
    return canAccessAllOrganizationMonitors(user);
  }
}
