import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

type FilterDefaults = Record<string, string>;
type AllowedValues<T extends FilterDefaults> = Partial<{
  [Key in keyof T]: readonly string[];
}>;

export function useUrlFilterState<T extends FilterDefaults>(
  defaults: T,
  allowedValues: AllowedValues<T> = {},
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    const nextFilters = { ...defaults };

    for (const key of Object.keys(defaults) as Array<keyof T>) {
      const rawValue = searchParams.get(String(key));
      const currentAllowedValues = allowedValues[key];

      if (!rawValue) {
        continue;
      }

      if (
        currentAllowedValues &&
        !currentAllowedValues.includes(rawValue)
      ) {
        continue;
      }

      nextFilters[key] = rawValue as T[keyof T];
    }

    return nextFilters;
  }, [allowedValues, defaults, searchParams]);

  const setFilter = <Key extends keyof T>(key: Key, value: T[Key]) => {
    const nextParams = new URLSearchParams(searchParams);

    if (value === defaults[key]) {
      nextParams.delete(String(key));
    } else {
      nextParams.set(String(key), value);
    }

    setSearchParams(nextParams, { replace: true });
  };

  const setFilters = (updates: Partial<T>) => {
    const nextParams = new URLSearchParams(searchParams);

    for (const [rawKey, rawValue] of Object.entries(updates)) {
      const key = rawKey as keyof T;
      const value = rawValue as T[keyof T] | undefined;

      if (typeof value !== 'string' || value === defaults[key]) {
        nextParams.delete(rawKey);
        continue;
      }

      nextParams.set(rawKey, value);
    }

    setSearchParams(nextParams, { replace: true });
  };

  const resetFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const hasActiveFilters = Object.keys(defaults).some(
    (key) => filters[key] !== defaults[key],
  );

  return {
    filters,
    hasActiveFilters,
    resetFilters,
    setFilter,
    setFilters,
  };
}
