export const MONITOR_CHECKS_QUEUE = 'monitor-checks';
export const MONITOR_CHECK_JOB_NAME = 'run-monitor-check';

export type MonitorCheckJobName = typeof MONITOR_CHECK_JOB_NAME;

export type MonitorCheckJobData = {
  monitorId: number;
  requestedAt: string;
  source: 'scheduler';
};

export type MonitorCheckJobResult =
  | {
      status: 'processed';
      monitorId: number;
    }
  | {
      status: 'skipped';
      monitorId: number;
      reason: 'duplicate-lock';
    };

export function buildMonitorCheckJobId(monitorId: number) {
  return `monitor-check:${monitorId}`;
}
