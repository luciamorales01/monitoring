import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { formatSeconds } from '../helpers/report-formatters';
import { buildReportFilename } from '../helpers/report-filename';
import { getRangeLabel } from '../helpers/report-period';
import {
  getReportDisplayStatus,
  getStatusColors,
} from '../helpers/report-status';
import type {
  ReportDataset,
  ReportExportContext,
  ReportFile,
  ReportIncidentRow,
  ReportRange,
  ReportRow,
} from '../types/report.types';
import type { ReportExporter } from './report-exporter.interface';

type Worksheet = ExcelJS.Worksheet;

const HEADER_FILL = 'E2E8F0';
const BRAND_FILL = '1E3A8A';
const WHITE = 'FFFFFF';

@Injectable()
export class ReportXlsxExporter implements ReportExporter {
  async export({
    dataset,
    filenameSuffix,
  }: ReportExportContext): Promise<ReportFile> {
    return {
      filename: buildReportFilename(dataset.summary.range, filenameSuffix, 'xlsx'),
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: await this.buildExcel(dataset),
    };
  }

  async buildExcel(dataset: ReportDataset) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Monitoring';
    workbook.created = new Date();

    this.addSummarySheet(workbook, dataset);
    this.addMonitorsSheet(workbook, dataset.summary.rows);
    this.addIncidentsSheet(workbook, dataset.incidents);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private addSummarySheet(workbook: ExcelJS.Workbook, dataset: ReportDataset) {
    const sheet = workbook.addWorksheet('Resumen');
    const totals = dataset.summary.totals;

    sheet.addRow(['Informe de monitorizacion', getRangeLabel(dataset.summary.range)]);
    sheet.addRow(['Generado desde', dataset.summary.from]);
    sheet.addRow(['Generado hasta', dataset.summary.to]);
    sheet.addRow(['Ambito', dataset.scopeName ?? 'Todos los monitores']);
    sheet.addRow([]);
    sheet.addRow(['Metrica', 'Valor']);
    sheet.addRow(['Monitores', totals.monitors]);
    sheet.addRow(['Uptime medio', totals.averageUptimePercent / 100]);
    sheet.addRow(['Tiempo medio de respuesta (ms)', totals.averageResponseTimeMs]);
    sheet.addRow(['Incidencias', totals.incidents]);
    sheet.addRow(['Checks', totals.checks]);
    sheet.addRow(['Downtime estimado (s)', totals.estimatedDowntimeSeconds]);
    sheet.addRow(['Downtime estimado', formatSeconds(totals.estimatedDowntimeSeconds)]);

    sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: WHITE } };
    sheet.getCell('B1').font = { bold: true, color: { argb: WHITE } };
    sheet.getRow(1).fill = this.solidFill(BRAND_FILL);
    sheet.getRow(6).font = { bold: true };
    sheet.getRow(6).fill = this.solidFill(HEADER_FILL);
    sheet.getColumn(1).width = 32;
    sheet.getColumn(2).width = 28;
    sheet.getCell('B8').numFmt = '0.00%';
    sheet.views = [{ state: 'frozen', ySplit: 6 }];
    sheet.autoFilter = 'A6:B13';
    this.applyBorders(sheet);
  }

  private addMonitorsSheet(workbook: ExcelJS.Workbook, rows: ReportRow[]) {
    const sheet = workbook.addWorksheet('Monitores');
    sheet.columns = [
      { header: 'Monitor', key: 'monitor', width: 24 },
      { header: 'URL', key: 'url', width: 42 },
      { header: 'Tipo', key: 'type', width: 14 },
      { header: 'Estado', key: 'status', width: 14 },
      { header: 'Uptime', key: 'uptime', width: 14 },
      { header: 'SLA', key: 'sla', width: 14 },
      { header: 'Downtime estimado (s)', key: 'downtimeSeconds', width: 22 },
      { header: 'Downtime estimado', key: 'downtimeLabel', width: 20 },
      { header: 'Tiempo medio (ms)', key: 'averageResponseTimeMs', width: 20 },
      { header: 'Incidencias', key: 'incidents', width: 16 },
      { header: 'Incidencias abiertas', key: 'openIncidents', width: 20 },
      { header: 'Checks', key: 'checks', width: 14 },
      { header: 'Checks DOWN', key: 'downChecks', width: 16 },
      { header: 'Ultima caida', key: 'lastDowntime', width: 26 },
    ];

    rows.forEach((row) => {
      const status = getReportDisplayStatus(row);
      sheet.addRow({
        monitor: row.monitor.name,
        url: row.monitor.target,
        type: row.monitor.type ?? '-',
        status,
        uptime: row.uptimePercent / 100,
        sla: (row.slaPercent ?? row.uptimePercent) / 100,
        downtimeSeconds: row.estimatedDowntimeSeconds ?? 0,
        downtimeLabel: formatSeconds(row.estimatedDowntimeSeconds ?? 0),
        averageResponseTimeMs: row.averageResponseTimeMs,
        incidents: row.incidents,
        openIncidents: row.openIncidents,
        checks: row.checks,
        downChecks: row.downChecks ?? 0,
        lastDowntime: row.lastDowntime ?? 'Sin caidas recientes',
      });

      const currentRow = sheet.lastRow;
      const statusCell = currentRow?.getCell('status');
      if (statusCell) {
        const colors = getStatusColors(status);
        statusCell.font = { bold: true, color: { argb: colors.fgColor } };
        statusCell.fill = this.solidFill(colors.bgColor);
      }
    });

    this.styleHeader(sheet);
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, rows.length + 1), column: sheet.columnCount },
    };
    sheet.getColumn('uptime').numFmt = '0.00%';
    sheet.getColumn('sla').numFmt = '0.00%';
    this.autoFitColumns(sheet);
    this.applyBorders(sheet);
  }

  private addIncidentsSheet(
    workbook: ExcelJS.Workbook,
    incidents: ReportIncidentRow[],
  ) {
    const sheet = workbook.addWorksheet('Incidencias');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Monitor', key: 'monitorName', width: 24 },
      { header: 'Estado', key: 'status', width: 16 },
      { header: 'Severidad', key: 'severity', width: 16 },
      { header: 'Titulo', key: 'title', width: 36 },
      { header: 'Inicio', key: 'startedAt', width: 26 },
      { header: 'Resolucion', key: 'resolvedAt', width: 26 },
      { header: 'Duracion (s)', key: 'durationSeconds', width: 16 },
    ];

    incidents.forEach((incident) => {
      sheet.addRow({
        id: incident.id,
        monitorName: incident.monitorName,
        status: incident.status,
        severity: incident.severity ?? '-',
        title: incident.title,
        startedAt: incident.startedAt,
        resolvedAt: incident.resolvedAt ?? '-',
        durationSeconds: incident.durationSeconds ?? '-',
      });
    });

    this.styleHeader(sheet);
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: {
        row: Math.max(1, incidents.length + 1),
        column: sheet.columnCount,
      },
    };
    this.autoFitColumns(sheet);
    this.applyBorders(sheet);
  }

  private styleHeader(sheet: Worksheet) {
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: WHITE } };
    header.fill = this.solidFill(BRAND_FILL);
    header.alignment = { vertical: 'middle' };
    header.height = 22;
  }

  private autoFitColumns(sheet: Worksheet) {
    sheet.columns.forEach((column) => {
      let maxLength = 12;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const value = cell.value;
        const text =
          value === null || value === undefined ? '' : String(value);
        maxLength = Math.max(maxLength, Math.min(text.length + 2, 48));
      });
      column.width = maxLength;
    });
  }

  private applyBorders(sheet: Worksheet) {
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'CBD5E1' } },
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
          right: { style: 'thin', color: { argb: 'CBD5E1' } },
        };
        cell.alignment = { vertical: 'middle' };
      });
    });
  }

  private solidFill(color: string): ExcelJS.Fill {
    return {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: color },
    };
  }
}
