import type { ReportRange } from '../types/report.types';

export function slugifyReportName(value: string) {
  return (
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'monitor'
  );
}

export function buildReportFilename(
  range: ReportRange,
  suffix: string,
  extension: string,
) {
  return `informe-monitoring-${range}-${suffix}.${extension}`;
}
