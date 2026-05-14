export const incidentFilterDefaults = {
  monitor: 'ALL',
  search: '',
  severity: 'ALL',
  status: 'ALL',
  tab: 'active',
};

export const incidentAllowedValues = {
  severity: ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  status: ['ALL', 'OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED'],
  tab: ['active', 'history'],
} as const;

