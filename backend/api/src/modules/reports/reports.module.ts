import { Module } from '@nestjs/common';
import { ReportsDataService } from './data/reports-data.service';
import { ReportCsvExporter } from './exporters/report-csv.exporter';
import { ReportPdfExporter } from './exporters/report-pdf.exporter';
import { ReportXlsxExporter } from './exporters/report-xlsx.exporter';
import { ReportMetricsService } from './metrics/report-metrics.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportsDataService,
    ReportMetricsService,
    ReportCsvExporter,
    ReportPdfExporter,
    ReportXlsxExporter,
  ],
})
export class ReportsModule {}
