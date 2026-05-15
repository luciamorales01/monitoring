import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { getDashboardSummary } from "./dashboardApi";
import {
  deleteMonitor,
  getMonitors,
  getPaginatedMonitors,
  runMonitorCheck,
  toggleMonitorActive,
  updateMonitor,
  type Monitor,
  type MonitorListQuery,
  type PaginatedMonitors,
  type UpdateMonitorInput,
} from "./monitorApi";

export const monitorQueryKeys = {
  all: ["monitors"] as const,
  allList: () => [...monitorQueryKeys.all, "all"] as const,
  lists: () => [...monitorQueryKeys.all, "list"] as const,
  list: (query: MonitorListQuery) => [...monitorQueryKeys.lists(), query] as const,
};

export const dashboardQueryKeys = {
  all: ["dashboard"] as const,
  summary: () => [...dashboardQueryKeys.all, "summary"] as const,
};

const MONITOR_LIST_STALE_TIME = 20_000;
const DASHBOARD_SUMMARY_STALE_TIME = 20_000;

function isPaginatedMonitors(data: unknown): data is PaginatedMonitors {
  return Boolean(
    data &&
      typeof data === "object" &&
      "items" in data &&
      Array.isArray((data as PaginatedMonitors).items),
  );
}

function updateMonitorData(
  data: Monitor[] | PaginatedMonitors | undefined,
  updater: (monitor: Monitor) => Monitor,
) {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map(updater);
  }

  if (isPaginatedMonitors(data)) {
    return {
      ...data,
      items: data.items.map(updater),
    };
  }

  return data;
}

function removeMonitorData(
  data: Monitor[] | PaginatedMonitors | undefined,
  ids: number[],
) {
  if (!data) return data;
  const idSet = new Set(ids);

  if (Array.isArray(data)) {
    return data.filter((monitor) => !idSet.has(monitor.id));
  }

  if (isPaginatedMonitors(data)) {
    const items = data.items.filter((monitor) => !idSet.has(monitor.id));

    return {
      ...data,
      items,
      total: Math.max(0, data.total - (data.items.length - items.length)),
    };
  }

  return data;
}

async function cancelMonitorQueries(queryClient: QueryClient) {
  await queryClient.cancelQueries({ queryKey: monitorQueryKeys.all });
}

function invalidateMonitorData(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: monitorQueryKeys.all });
  void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all });
}

export function useAllMonitorsQuery(
  options: { refetchInterval?: number | false; adaptiveRefetchInterval?: boolean } = {},
) {
  return useQuery({
    queryKey: monitorQueryKeys.allList(),
    queryFn: () => getMonitors(),
    refetchInterval:
      options.refetchInterval ??
      (options.adaptiveRefetchInterval
        ? (query) => {
            const monitors = query.state.data ?? [];
            return monitors.some((monitor) => monitor.currentStatus === "DOWN")
              ? 10_000
              : 30_000;
          }
        : false),
    refetchOnWindowFocus: false,
    staleTime: MONITOR_LIST_STALE_TIME,
  });
}

export function usePaginatedMonitorsQuery(query: MonitorListQuery) {
  return useQuery({
    queryKey: monitorQueryKeys.list(query),
    queryFn: ({ signal }) => getPaginatedMonitors(query, signal),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: MONITOR_LIST_STALE_TIME,
  });
}

export function useDashboardSummaryQuery() {
  return useQuery({
    queryKey: dashboardQueryKeys.summary(),
    queryFn: getDashboardSummary,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: DASHBOARD_SUMMARY_STALE_TIME,
  });
}

export function useRunMonitorCheckMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runMonitorCheck,
    onMutate: async (id) => {
      await cancelMonitorQueries(queryClient);
      queryClient.setQueriesData<Monitor[] | PaginatedMonitors>(
        { queryKey: monitorQueryKeys.all },
        (data) =>
          updateMonitorData(data, (monitor) =>
            monitor.id === id
              ? { ...monitor, currentStatus: "UNKNOWN", lastCheckedAt: new Date().toISOString() }
              : monitor,
          ),
      );
    },
    onSettled: () => invalidateMonitorData(queryClient),
  });
}

export function useToggleMonitorActiveMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleMonitorActive,
    onMutate: async (id) => {
      await cancelMonitorQueries(queryClient);
      queryClient.setQueriesData<Monitor[] | PaginatedMonitors>(
        { queryKey: monitorQueryKeys.all },
        (data) =>
          updateMonitorData(data, (monitor) =>
            monitor.id === id
              ? { ...monitor, isActive: !monitor.isActive }
              : monitor,
          ),
      );
    },
    onSuccess: (updatedMonitor) => {
      queryClient.setQueriesData<Monitor[] | PaginatedMonitors>(
        { queryKey: monitorQueryKeys.all },
        (data) =>
          updateMonitorData(data, (monitor) =>
            monitor.id === updatedMonitor.id ? updatedMonitor : monitor,
          ),
      );
    },
    onSettled: () => invalidateMonitorData(queryClient),
  });
}

export function useUpdateMonitorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMonitorInput }) =>
      updateMonitor(id, data),
    onMutate: async ({ id, data }) => {
      await cancelMonitorQueries(queryClient);
      queryClient.setQueriesData<Monitor[] | PaginatedMonitors>(
        { queryKey: monitorQueryKeys.all },
        (currentData) =>
          updateMonitorData(currentData, (monitor) =>
            monitor.id === id ? { ...monitor, ...data } : monitor,
          ),
      );
    },
    onSuccess: (updatedMonitor) => {
      queryClient.setQueriesData<Monitor[] | PaginatedMonitors>(
        { queryKey: monitorQueryKeys.all },
        (data) =>
          updateMonitorData(data, (monitor) =>
            monitor.id === updatedMonitor.id ? updatedMonitor : monitor,
          ),
      );
    },
    onSettled: () => invalidateMonitorData(queryClient),
  });
}

export function useDeleteMonitorsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => Promise.all(ids.map((id) => deleteMonitor(id))),
    onMutate: async (ids) => {
      await cancelMonitorQueries(queryClient);
      queryClient.setQueriesData<Monitor[] | PaginatedMonitors>(
        { queryKey: monitorQueryKeys.all },
        (data) => removeMonitorData(data, ids),
      );
    },
    onSettled: () => invalidateMonitorData(queryClient),
  });
}
