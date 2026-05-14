import { useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { appEnv } from "./env";
import { tokenStorage } from "./tokenStorage";
import { dashboardQueryKeys, monitorQueryKeys } from "./monitorQueries";

export const realtimeEventName = "monitoring:realtime-event";

type MonitoringEventName =
  | "monitor.checked"
  | "monitor.status_changed"
  | "incident.created"
  | "incident.resolved";

type MonitoringEventPayload = {
  checkedAt?: string;
  incidentId?: number;
  monitorId?: number;
  previousStatus?: string | null;
  resolvedAt?: string;
  startedAt?: string;
  status?: string;
};

export type MonitoringRealtimeEvent = {
  name: MonitoringEventName;
  payload: MonitoringEventPayload;
};

const incidentQueryKey = ["incidents"] as const;
const notificationQueryKey = ["notifications"] as const;
const reportQueryKey = ["reports"] as const;
const statusQueryKey = ["status"] as const;
const monitoringEventNames = [
  "monitor.checked",
  "monitor.status_changed",
  "incident.created",
  "incident.resolved",
] as const;

function buildEventsUrl(token: string) {
  const url = new URL(`${appEnv.apiUrl}/events`);
  url.searchParams.set("token", token);
  return url.toString();
}

function invalidateMonitorViews(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: monitorQueryKeys.all });
  void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all });
  void queryClient.invalidateQueries({ queryKey: reportQueryKey });
  void queryClient.invalidateQueries({ queryKey: statusQueryKey });
}

function invalidateIncidentViews(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: incidentQueryKey });
  void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all });
  void queryClient.invalidateQueries({ queryKey: monitorQueryKeys.all });
  void queryClient.invalidateQueries({ queryKey: notificationQueryKey });
  void queryClient.invalidateQueries({ queryKey: reportQueryKey });
  void queryClient.invalidateQueries({ queryKey: statusQueryKey });
}

function handleMonitoringEvent(
  queryClient: QueryClient,
  name: MonitoringEventName,
  payload: MonitoringEventPayload,
) {
  if (name === "monitor.checked" || name === "monitor.status_changed") {
    invalidateMonitorViews(queryClient);
  }

  if (name === "incident.created" || name === "incident.resolved") {
    invalidateIncidentViews(queryClient);
  }

  window.dispatchEvent(
    new CustomEvent<MonitoringRealtimeEvent>(realtimeEventName, {
      detail: { name, payload },
    }),
  );
}

function parseEventPayload(data: string) {
  try {
    return JSON.parse(data) as MonitoringEventPayload;
  } catch {
    return {};
  }
}

export function useMonitoringEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = tokenStorage.get();
    if (!token) return undefined;

    const eventSource = new EventSource(buildEventsUrl(token));
    const listeners: Array<[MonitoringEventName, (event: Event) => void]> = [
      ...monitoringEventNames,
    ].map((name) => [
      name,
      (event) => {
        if (!(event instanceof MessageEvent)) return;
        handleMonitoringEvent(queryClient, name, parseEventPayload(String(event.data)));
      },
    ]);

    listeners.forEach(([name, listener]) => {
      eventSource.addEventListener(name, listener);
    });

    const closeConnection = () => eventSource.close();
    window.addEventListener("auth:expired", closeConnection);

    return () => {
      window.removeEventListener("auth:expired", closeConnection);
      listeners.forEach(([name, listener]) => {
        eventSource.removeEventListener(name, listener);
      });
      eventSource.close();
    };
  }, [queryClient]);
}
