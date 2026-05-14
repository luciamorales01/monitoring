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

