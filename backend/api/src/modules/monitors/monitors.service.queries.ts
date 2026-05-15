import { Prisma } from '@prisma/client';

export const monitorListSelect = {
  id: true,
  name: true,
  type: true,
  target: true,
  expectedStatusCode: true,
  frequencySeconds: true,
  timeoutSeconds: true,
  currentStatus: true,
  lastResponseTime: true,
  lastCheckedAt: true,
  nextCheckAt: true,
  isActive: true,
  alertEmail: true,
  alertThreshold: true,
  tcpPort: true,
  sslWarningDays: true,
  dnsRecordType: true,
  dnsExpectedValue: true,
} satisfies Prisma.MonitorSelect;

const monitorSectionsRelation = {
  include: { section: { include: { members: true } } },
  orderBy: { assignedAt: 'asc' as const },
};

export const monitorSectionsInclude = {
  sections: monitorSectionsRelation,
} satisfies Prisma.MonitorInclude;

export const monitorDetailInclude = {
  checkResults: {
    orderBy: { checkedAt: 'desc' },
    take: 20,
  },
  sections: monitorSectionsRelation,
} satisfies Prisma.MonitorInclude;
