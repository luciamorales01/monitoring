export type MonitorType = 'HTTP' | 'HTTPS';
export type MonitorStatus = 'UP' | 'DOWN' | 'DEGRADED';

export interface Monitor {
  id: number;
  name: string;
  type: MonitorType;
  target: string;
  currentStatus: MonitorStatus;
  frequencySeconds: number;
  timeoutSeconds: number;
}
