import type { ReportExportContext, ReportFile } from '../types/report.types';

export interface ReportExporter {
  export(context: ReportExportContext): Promise<ReportFile> | ReportFile;
}
