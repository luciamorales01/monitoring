export function normalizeSearchTerm(value: string) {
  return value.trim().toLowerCase();
}

export function matchesSearchTerm(
  searchTerm: string,
  ...candidates: Array<string | number | null | undefined>
) {
  if (!searchTerm) {
    return true;
  }

  return candidates.some((candidate) =>
    String(candidate ?? '').toLowerCase().includes(searchTerm),
  );
}

export function getUniqueOptions(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort(
    (firstValue, secondValue) => firstValue.localeCompare(secondValue),
  );
}

export function isDateWithinLastDays(value: string, days: number) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  const diffDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
  return diffDays < days;
}
