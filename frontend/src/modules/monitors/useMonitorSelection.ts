import { useEffect, useRef, useState } from 'react';
import type {
  ToggleMonitorSelectionOptions,
} from './MonitorListCard.types';

type UseMonitorSelectionOptions = {
  canSelect: boolean;
  currentPageIds: number[];
};

export function useMonitorSelection({
  canSelect,
  currentPageIds,
}: UseMonitorSelectionOptions) {
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const lastSelectedMonitorIdRef = useRef<number | null>(null);
  const [selectedMonitorIds, setSelectedMonitorIds] = useState<number[]>([]);

  const areAllCurrentPageSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedMonitorIds.includes(id));

  const hasSomeCurrentPageSelected =
    !areAllCurrentPageSelected &&
    currentPageIds.some((id) => selectedMonitorIds.includes(id));

  const clearSelection = () => {
    setSelectedMonitorIds([]);
    lastSelectedMonitorIdRef.current = null;
  };

  useEffect(() => {
    if (!selectAllRef.current) return;

    selectAllRef.current.indeterminate = hasSomeCurrentPageSelected;
  }, [hasSomeCurrentPageSelected]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canSelect) return;

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName ?? '';
      const isTypingTarget =
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        target?.isContentEditable;

      if (isTypingTarget) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
        if (currentPageIds.length === 0) return;

        event.preventDefault();
        setSelectedMonitorIds((current) =>
          Array.from(new Set([...current, ...currentPageIds])),
        );
        lastSelectedMonitorIdRef.current = currentPageIds.at(-1) ?? null;
        return;
      }

      if (event.key === 'Escape' && selectedMonitorIds.length > 0) {
        event.preventDefault();
        setSelectedMonitorIds([]);
        lastSelectedMonitorIdRef.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canSelect, currentPageIds, selectedMonitorIds.length]);

  const toggleMonitorSelection = (
    id: number,
    options?: ToggleMonitorSelectionOptions,
  ) => {
    if (!canSelect) return;

    setSelectedMonitorIds((current) => {
      if (
        options?.range &&
        lastSelectedMonitorIdRef.current !== null &&
        currentPageIds.includes(lastSelectedMonitorIdRef.current)
      ) {
        const startIndex = currentPageIds.indexOf(lastSelectedMonitorIdRef.current);
        const endIndex = currentPageIds.indexOf(id);

        if (startIndex >= 0 && endIndex >= 0) {
          const [from, to] =
            startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
          const rangeIds = currentPageIds.slice(from, to + 1);

          return Array.from(new Set([...current, ...rangeIds]));
        }
      }

      return current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
    });

    lastSelectedMonitorIdRef.current = id;
  };

  const toggleCurrentPageSelection = () => {
    if (!canSelect) return;

    setSelectedMonitorIds((current) => {
      if (areAllCurrentPageSelected) {
        return current.filter((id) => !currentPageIds.includes(id));
      }

      return Array.from(new Set([...current, ...currentPageIds]));
    });
  };

  return {
    areAllCurrentPageSelected,
    clearSelection,
    hasSomeCurrentPageSelected,
    selectAllRef,
    selectedMonitorIds,
    setSelectedMonitorIds,
    toggleCurrentPageSelection,
    toggleMonitorSelection,
  };
}
