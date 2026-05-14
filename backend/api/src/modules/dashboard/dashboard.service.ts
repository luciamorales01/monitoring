import { Injectable } from '@nestjs/common';
import { IncidentStatus, MonitorStatus } from '@prisma/client';
import {
  buildAccessibleCheckResultWhere,
  buildAccessibleIncidentWhere,
  buildAccessibleMonitorWhere,
  type AuthenticatedUser,
} from '../../common/monitor-access-scope';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(user: AuthenticatedUser) {
    const accessibleMonitorWhere = buildAccessibleMonitorWhere(user);

    const [
      totalMonitors,
      activeMonitors,
      onlineMonitors,
      downMonitors,
      openIncidents,
      recentChecks,
    ] = await Promise.all([
      this.prisma.monitor.count({ where: accessibleMonitorWhere }),
      this.prisma.monitor.count({
        where: { ...accessibleMonitorWhere, isActive: true },
      }),
      this.prisma.monitor.count({
        where: {
          ...accessibleMonitorWhere,
          isActive: true,
          currentStatus: MonitorStatus.UP,
        },
      }),
      this.prisma.monitor.count({
        where: {
          ...accessibleMonitorWhere,
          isActive: true,
          currentStatus: MonitorStatus.DOWN,
        },
      }),
      this.prisma.incident.count({
        where: {
          status: IncidentStatus.OPEN,
          ...buildAccessibleIncidentWhere(user),
        },
      }),
      this.prisma.checkResult.findMany({
        where: buildAccessibleCheckResultWhere(user),
        orderBy: { checkedAt: 'desc' },
        take: 1000,
        select: {
          status: true,
          responseTimeMs: true,
          checkedAt: true,
          monitor: {
            select: {
              id: true,
              name: true,
              target: true,
            },
          },
        },
      }),
    ]);

    const successfulChecks = recentChecks.filter(
      (check) => check.status === MonitorStatus.UP,
    ).length;
    const checksWithResponse = recentChecks.filter(
      (check) => typeof check.responseTimeMs === 'number',
    );
    const averageResponseTimeMs = checksWithResponse.length
      ? Math.round(
          checksWithResponse.reduce(
            (sum, check) => sum + (check.responseTimeMs ?? 0),
            0,
          ) / checksWithResponse.length,
        )
      : 0;

    const uptimePercent = recentChecks.length
      ? Number(((successfulChecks / recentChecks.length) * 100).toFixed(2))
      : activeMonitors
        ? Number(((onlineMonitors / activeMonitors) * 100).toFixed(2))
        : 0;

    return {
      totalMonitors,
      activeMonitors,
      onlineMonitors,
      downMonitors,
      pausedMonitors: totalMonitors - activeMonitors,
      openIncidents,
      uptimePercent,
      averageResponseTimeMs,
      recentChecks: recentChecks.slice(0, 10),
      generatedAt: new Date().toISOString(),
    };
  }
}
