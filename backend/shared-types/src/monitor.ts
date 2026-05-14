export type MonitorType = 'HTTP' | 'HTTPS' | 'TCP';
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