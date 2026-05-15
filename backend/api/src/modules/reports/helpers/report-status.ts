import type { ReportRow } from '../types/report.types';

export type ReportDisplayStatus = 'UP' | 'DOWN' | 'PAUSED' | 'UNKNOWN';

export function getReportDisplayStatus(row: ReportRow): ReportDisplayStatus {
  if (!row.monitor.isActive) return 'PAUSED';
  if (row.monitor.currentStatus === 'UP') return 'UP';
  if (row.monitor.currentStatus === 'DOWN') return 'DOWN';
  return 'UNKNOWN';
}

export function getStatusColors(status: ReportDisplayStatus) {
  if (status === 'UP') {
    return { fgColor: '166534', bgColor: 'DCFCE7' };
  }

  if (status === 'DOWN') {
    return { fgColor: '991B1B', bgColor: 'FEE2E2' };
  }

  if (status === 'PAUSED') {
    return { fgColor: '92400E', bgColor: 'FEF3C7' };
  }

  return { fgColor: '475569', bgColor: 'E2E8F0' };
}
