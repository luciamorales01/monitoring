export function csvEscape(value: unknown) {
  let normalized = '';

  if (value !== null && value !== undefined) {
    if (typeof value === 'string') {
      normalized = value;
    } else if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint' ||
      typeof value === 'symbol'
    ) {
      normalized = String(value);
    } else {
      normalized = JSON.stringify(value) ?? '';
    }
  }

  return `"${normalized.replaceAll('"', '""')}"`;
}

export function formatSeconds(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

export function sanitizePdfLine(line: string) {
  return line
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[\\()]/g, (match) => `\\${match}`);
}
