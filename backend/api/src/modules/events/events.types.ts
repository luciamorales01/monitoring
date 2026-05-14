export const MONITORING_EVENTS_CHANNEL = 'monitoring:events';

export const MonitoringEventName = {
  MONITOR_CHECKED: 'monitor.checked',
  MONITOR_STATUS_CHANGED: 'monitor.status_changed',
  INCIDENT_CREATED: 'incident.created',
  INCIDENT_RESOLVED: 'incident.resolved',
} as const;

export type MonitoringEventNameValue =
  (typeof MonitoringEventName)[keyof typeof MonitoringEventName];

type MonitorEventPayload = {
  checkedAt?: string;
  incidentId?: number;
  monitorId: number;
  organizationId: number;
  previousStatus?: string | null;
  status?: string;
};

type IncidentEventPayload = {
  incidentId: number;
  monitorId?: number;
  organizationId: number;
  resolvedAt?: string;
  startedAt?: string;
};

export type MonitoringEvent =
  | {
      name:
        | typeof MonitoringEventName.MONITOR_CHECKED
        | typeof MonitoringEventName.MONITOR_STATUS_CHANGED;
      payload: MonitorEventPayload;
    }
  | {
      name:
        | typeof MonitoringEventName.INCIDENT_CREATED
        | typeof MonitoringEventName.INCIDENT_RESOLVED;
      payload: IncidentEventPayload;
    };
