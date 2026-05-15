export const MonitorStatus = {
  UP: 'UP',
  DOWN: 'DOWN',
  UNKNOWN: 'UNKNOWN',
} as const;

export const IncidentStatus = {
  OPEN: 'OPEN',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESOLVED: 'RESOLVED',
} as const;

export type MonitorStatusValue =
  (typeof MonitorStatus)[keyof typeof MonitorStatus];

export type MonitorEntity = {
  id: number;
  name?: string;
  type: string;
  target: string;
  expectedStatusCode: number;
  frequencySeconds: number;
  timeoutSeconds: number;
  organizationId: number;
  currentStatus?: MonitorStatusValue | null;
  isActive?: boolean;
  alertThreshold?: number | null;
  alertEmail?: boolean | null;
  usesSectionSchedule?: boolean | null;
  sections?: {
    section: {
      id: number;
      expectedStatusCode: number;
      frequencySeconds: number;
      timeoutSeconds: number;
      isActive: boolean;
      members?: { userId: number }[];
    };
  }[];
};

export type CheckResultEntity = {
  id?: number;
  monitorId?: number;
  status: MonitorStatusValue;
  checkedAt: Date;
};

export type MonitorCheckOutcome = {
  checkedAt: Date;
  errorMessage: string | null;
  responseTimeMs: number;
  status: MonitorStatusValue;
  statusCode: number | null;
};

export type MonitorCheckBatchResult = {
  overallStatus: MonitorStatusValue;
  results: unknown[];
};

export type IncidentSyncResult =
  | {
      type: 'created';
      incidentId: number;
      happenedAt: Date;
      title: string;
      severity?: string | null;
      errorMessage?: string | null;
      shouldNotify: boolean;
    }
  | {
      type: 'resolved';
      incidentId: number;
      happenedAt: Date;
      title: string;
      severity?: string | null;
      shouldNotify: boolean;
    }
  | null;

export type PersistedCheckResult = MonitorCheckBatchResult & {
  checkedAt: Date;
  incidentSync: IncidentSyncResult;
  previousStatus: MonitorStatusValue | null;
};
