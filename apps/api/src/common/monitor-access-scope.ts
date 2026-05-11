import { Prisma, UserRole } from '@prisma/client';

export type AuthenticatedUser = {
  organizationId: number;
  userId: number;
  role?: string;
};

export function canAccessAllOrganizationMonitors(user: AuthenticatedUser) {
  return !user.role || user.role === UserRole.OWNER;
}

export function buildAccessibleMonitorWhere(
  user: AuthenticatedUser,
): Prisma.MonitorWhereInput {
  return {
    organizationId: user.organizationId,
    ...(canAccessAllOrganizationMonitors(user)
      ? {}
      : {
          sections: {
            some: {
              section: {
                members: {
                  some: { userId: user.userId },
                },
              },
            },
          },
        }),
  };
}

export function buildAccessibleCheckResultWhere(
  user: AuthenticatedUser,
): Prisma.CheckResultWhereInput {
  return {
    monitor: buildAccessibleMonitorWhere(user),
  };
}

export function buildAccessibleIncidentWhere(
  user: AuthenticatedUser,
): Prisma.IncidentWhereInput {
  return {
    monitor: buildAccessibleMonitorWhere(user),
  };
}

export function buildAccessibleNotificationWhere(
  user: AuthenticatedUser,
): Prisma.NotificationEventWhereInput {
  return {
    monitor: buildAccessibleMonitorWhere(user),
  };
}
