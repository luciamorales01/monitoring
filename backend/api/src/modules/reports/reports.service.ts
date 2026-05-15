import { Injectable } from '@nestjs/common';
import { ReportsDataService } from './data/reports-data.service';
import { ReportCsvExporter } from './exporters/report-csv.exporter';
import { ReportPdfExporter } from './exporters/report-pdf.exporter';
import { ReportXlsxExporter } from './exporters/report-xlsx.exporter';
import { slugifyReportName } from './helpers/report-filename';
import type {
  ExportReportParams,
  ReportFormat,
  ReportRange,
} from './types/report.types';
import type { AuthenticatedUser } from '../../common/monitor-access-scope';

@Injectable()
export class ReportsService {
  constructor(
    private readonly reportsData: ReportsDataService,
    private readonly csvExporter: ReportCsvExporter,
    private readonly pdfExporter: ReportPdfExporter,
    private readonly xlsxExporter: ReportXlsxExporter,
  ) {}

  async getSummary(
    user: AuthenticatedUser,
    range: ReportRange,
    monitorId?: number,
    sectionId?: number,
  ) {
    const dataset = await this.reportsData.getDataset({
      user,
      range,
      monitorId,
      sectionId,
    });

    return dataset.summary;
  }

  async exportReport(params: ExportReportParams) {
    const dataset = await this.reportsData.getDataset({
      user: params.user,
      range: params.range,
      monitorId: params.monitorId,
      sectionId: params.sectionId,
    });
    const filenameSuffix = this.getFilenameSuffix(params, dataset.scopeName);
    const exporter = this.getExporter(params.format);

    return exporter.export({ dataset, filenameSuffix });
  }

  private getExporter(format: ReportFormat) {
    if (format === 'xlsx') return this.xlsxExporter;
    if (format === 'pdf') return this.pdfExporter;
    return this.csvExporter;
  }

  private getFilenameSuffix(
    params: Pick<ExportReportParams, 'monitorId' | 'sectionId'>,
    scopeName: string | null,
  ) {
    if (params.monitorId && scopeName) {
      return slugifyReportName(scopeName);
    }

    if (params.sectionId) {
      return scopeName
        ? slugifyReportName(scopeName)
        : `seccion-${params.sectionId}`;
    }

    return 'todos-los-monitores';
  }
}
