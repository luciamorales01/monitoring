import { Injectable } from '@nestjs/common';
import { csvEscape, formatSeconds } from '../helpers/report-formatters';
import { buildReportFilename } from '../helpers/report-filename';
import type { ReportExportContext, ReportFile, ReportRow } from '../types/report.types';
import type { ReportExporter } from './report-exporter.interface';

@Injectable()
export class ReportCsvExporter implements ReportExporter {
  export({ dataset, filenameSuffix }: ReportExportContext): ReportFile {
    return {
      filename: buildReportFilename(dataset.summary.range, filenameSuffix, 'csv'),
      contentType: 'text/csv; charset=utf-8',
      buffer: Buffer.from(this.buildCsv(dataset.summary.rows), 'utf8'),
    };
  }

  buildCsv(rows: ReportRow[]) {
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

    return [header, ...lines]
      .map((line) => line.map(csvEscape).join(','))
      .join('\n');
  }
}
