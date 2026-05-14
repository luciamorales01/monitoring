export type ReportType = 'PDF' | 'EXCEL';
export type ReportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Report {
  id: number;
  type: ReportType;
  status: ReportStatus;
  rangeStart: string;
  rangeEnd: string;
  fileUrl?: string | null;
}