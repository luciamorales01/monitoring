export type SectionIcon =
  | 'folder'
  | 'globe'
  | 'monitor'
  | 'database'
  | 'cloud'
  | 'code'
  | 'drive';

export type MonitorSection = {
  id: string;
  name: string;
  description: string;
  icon: SectionIcon;
  expectedStatusCode: number;
  frequencySeconds: number;
  timeoutSeconds: number;
  isActive: boolean;
  monitorIds: number[];
  memberIds: number[];
  createdAt: string;
  updatedAt: string;
};
