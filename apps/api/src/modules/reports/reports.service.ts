import { Injectable, NotFoundException } from '@nestjs/common';
import { IncidentStatus, MonitorStatus } from '@prisma/client';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../database/prisma/prisma.service';

type AuthenticatedUser = {
  organizationId: number;
  userId: number;
};

type ReportRange = '24h' | '7d' | '30d';
type ReportFormat = 'csv' | 'pdf' | 'xlsx';

type ExportReportParams = {
  user: AuthenticatedUser;
  range: ReportRange;
  format: ReportFormat;
  monitorId?: number;
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

function getRangeStart(range: ReportRange) {
  const now = new Date();
  const hours = range === '24h' ? 24 : range === '30d' ? 24 * 30 : 24 * 7;
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

function getRangeLabel(range: ReportRange) {
  if (range === '24h') return 'Ultimas 24 horas';
  if (range === '30d') return 'Ultimos 30 dias';
  return 'Ultimos 7 dias';
}

function getDowntimeSeconds(range: ReportRange, checks: number, downChecks: number) {
  if (checks <= 0 || downChecks <= 0) return 0;
  const rangeSeconds = range === '24h' ? 86_400 : range === '30d' ? 2_592_000 : 604_800;
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

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(user: AuthenticatedUser, range: ReportRange, monitorId?: number) {
    const organizationId = user.organizationId;
    const from = getRangeStart(range);

    if (monitorId) {
      const monitor = await this.prisma.monitor.findFirst({
        where: { id: monitorId, organizationId },
        select: { id: true },
      });

      if (!monitor) {
        throw new NotFoundException('Monitor no encontrado');
      }
    }

    const monitors = await this.prisma.monitor.findMany({
      where: {
        organizationId,
        ...(monitorId ? { id: monitorId } : {}),
      },
      include: {
        checkResults: {
          where: { checkedAt: { gte: from } },
          orderBy: { checkedAt: 'asc' },
          select: {
            status: true,
            responseTimeMs: true,
            checkedAt: true,
          },
        },
        incidents: {
          where: { startedAt: { gte: from } },
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

      const estimatedDowntimeSeconds = getDowntimeSeconds(range, checks.length, downChecks);

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
      to: new Date().toISOString(),
      selectedMonitorId: monitorId ?? null,
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
    const summary = await this.getSummary(params.user, params.range, params.monitorId);
    const suffix = params.monitorId && summary.rows[0]
      ? this.slugify(summary.rows[0].monitor.name)
      : 'todos-los-monitores';

    if (params.format === 'xlsx') {
      return {
        filename: `informe-monitoring-${params.range}-${suffix}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: await this.buildExcel(summary.rows, summary.range),
      };
    }

    if (params.format === 'pdf') {
      return {
        filename: `informe-monitoring-${params.range}-${suffix}.pdf`,
        contentType: 'application/pdf',
        buffer: this.buildPdf(summary.rows, summary.range),
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

  private async buildExcel(rows: ReportRow[], range: ReportRange) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Monitoring';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Informe');
    sheet.addRow(['Informe de monitorizacion', getRangeLabel(range)]);
    sheet.addRow([]);
    sheet.addRow([
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

    rows.forEach((row) => {
      sheet.addRow([
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
    });

    sheet.columns.forEach((column) => {
      column.width = 20;
    });
    sheet.getColumn(2).width = 42;
    sheet.getRow(3).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private buildPdf(rows: ReportRow[], range: ReportRange) {
    const title = `Informe Monitoring - ${getRangeLabel(range)}`;
    const lines = [
      title,
      '',
      ...rows.flatMap((row) => [
        `${row.monitor.name} (${row.monitor.type ?? 'HTTP'})`,
        `URL: ${row.monitor.target}`,
        `Estado: ${row.monitor.currentStatus}`,
        `Uptime/SLA: ${row.uptimePercent}%`,
        `Tiempo medio: ${row.averageResponseTimeMs} ms`,
        `Downtime estimado: ${formatSeconds(row.estimatedDowntimeSeconds ?? 0)}`,
        `Incidencias: ${row.incidents} | Checks: ${row.checks}`,
        '',
      ]),
    ];

    return this.buildSimplePdf(lines);
  }

  private buildSimplePdf(lines: string[]) {
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
        index === 0 ? '' : '0 -18 Td',
        index === 1 ? '/F1 11 Tf' : '',
        `(${line}) Tj`,
      ]),
      'ET',
    ].filter(Boolean).join('\n');

    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
      `5 0 obj\n<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream\nendobj`,
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
}
