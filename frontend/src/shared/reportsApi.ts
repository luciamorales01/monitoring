import { appEnv } from './env';
import { tokenStorage } from './tokenStorage';

export type ReportRange = '24h' | '7d' | '30d';
export type ReportFormat = 'csv' | 'pdf' | 'xlsx';
export type ReportScope = {
  monitorId?: number | string | null;
  sectionId?: number | string | null;
};

function buildReportsQuery(range: ReportRange, scope?: ReportScope) {
  const params = new URLSearchParams({ range });

  if (scope?.monitorId && scope.monitorId !== 'all') {
    params.set('monitorId', String(scope.monitorId));
  }

  if (scope?.sectionId && scope.sectionId !== 'all') {
    params.set('sectionId', String(scope.sectionId));
  }

  return params.toString();
}

export async function downloadReportExport(
  range: ReportRange,
  format: ReportFormat,
  scope?: ReportScope,
) {
  const token = tokenStorage.get();
  const params = new URLSearchParams(buildReportsQuery(range, scope));
  params.set('format', format);

  const response = await fetch(`${appEnv.apiUrl}/reports/export?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw new Error('No se pudo exportar el informe.');
  }

  const contentDisposition = response.headers.get('content-disposition');
  const filename =
    contentDisposition?.match(/filename="?([^";]+)"?/)?.[1] ??
    `informe-monitoring-${range}.${format}`;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
