import type { ReactNode } from 'react';
import type { Monitor } from '../../shared/monitorApi';

export type DashboardKpiTone = 'green' | 'blue' | 'orange' | 'purple';

export type DashboardKpiItem = {
  icon: ReactNode;
  note: string;
  title: string;
  tone: DashboardKpiTone;
  value: number | string;
};

export type DashboardAlertItem = Pick<Monitor, 'id' | 'name' | 'target'>;
