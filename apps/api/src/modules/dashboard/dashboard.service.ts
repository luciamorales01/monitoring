import { Injectable } from '@nestjs/common';
import { IncidentStatus, MonitorStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

type AuthenticatedUser = {
  organizationId: number;
  userId: number;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(user: AuthenticatedUser) {
    const organizationId = user.organizationId;

    const [totalMonitors, activeMonitors, onlineMonitors, downMonitors, openIncidents, recentChecks] =
      await Promise.all([
        this.prisma.monitor.count({ where: { organizationId } }),
        this.prisma.monitor.count({ where: { organizationId, isActive: true } }),
        this.prisma.monitor.count({ where: { organizationId, isActive: true, currentStatus: MonitorStatus.UP } }),
        this.prisma.monitor.count({ where: { organizationId, isActive: true, currentStatus: MonitorStatus.DOWN } }),
        this.prisma.incident.count({
          where: {
            status: IncidentStatus.OPEN,
            monitor: { organizationId },
          },
        }),
        this.prisma.checkResult.findMany({
          where: { monitor: { organizationId } },
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

    const successfulChecks = recentChecks.filter((check) => check.status === MonitorStatus.UP).length;
    const checksWithResponse = recentChecks.filter((check) => typeof check.responseTimeMs === 'number');
    const averageResponseTimeMs = checksWithResponse.length
      ? Math.round(
          checksWithResponse.reduce((sum, check) => sum + (check.responseTimeMs ?? 0), 0) /
            checksWithResponse.length,
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
