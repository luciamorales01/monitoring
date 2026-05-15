import type { ReportRange } from '../types/report.types';

export function getRangeStart(range: ReportRange) {
  const now = new Date();
  const hours = range === '24h' ? 24 : range === '30d' ? 24 * 30 : 24 * 7;
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

export function getRangeLabel(range: ReportRange) {
  if (range === '24h') return 'Ultimas 24 horas';
  if (range === '30d') return 'Ultimos 30 dias';
  return 'Ultimos 7 dias';
}

export function getRangeSeconds(range: ReportRange) {
  if (range === '24h') return 86_400;
  if (range === '30d') return 2_592_000;
  return 604_800;
}
