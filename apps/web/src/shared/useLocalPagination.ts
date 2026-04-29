import { useEffect, useMemo, useState } from 'react';

type UseLocalPaginationOptions = {
  pageSize?: number;
  resetKey?: string | number;
};

export function useLocalPagination<T>(
  items: T[],
  options: UseLocalPaginationOptions = {},
) {
  const { pageSize = 10, resetKey } = options;
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  const pageItems = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, page, pageSize]);

  const rangeStart = items.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, items.length);

  return {
    page,
    setPage,
    pageItems,
    pageSize,
    totalPages,
    rangeStart,
    rangeEnd,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}
