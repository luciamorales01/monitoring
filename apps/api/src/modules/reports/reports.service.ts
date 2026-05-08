import { Injectable } from '@nestjs/common';
import { IncidentStatus, MonitorStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

type AuthenticatedUser = {
  organizationId: number;
  userId: number;
};

type ReportRange = '24h' | '7d' | '30d';

function getRangeStart(range: ReportRange) {
  const now = new Date();
  const hours = range === '24h' ? 24 : range === '30d' ? 24 * 30 : 24 * 7;
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(user: AuthenticatedUser, range: ReportRange) {
    const organizationId = user.organizationId;
    const from = getRangeStart(range);

    const monitors = await this.prisma.monitor.findMany({
      where: { organizationId },
      include: {
        checkResults: {
          where: { checkedAt: { gte: from } },
          orderBy: { checkedAt: 'asc' },
          select: {
            status: true,
            responseTimeMs: true,
            checkedAt: true,
          },
        },
        incidents: {
          where: { startedAt: { gte: from } },
          orderBy: { startedAt: 'desc' },
          select: {
            id: true,
            status: true,
            startedAt: true,
            resolvedAt: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const rows = monitors.map((monitor) => {
      const checks = monitor.checkResults;
      const upChecks = checks.filter((check) => check.status === MonitorStatus.UP).length;
      const checksWithResponse = checks.filter((check) => typeof check.responseTimeMs === 'number');
      const averageResponseTimeMs = checksWithResponse.length
        ? Math.round(
            checksWithResponse.reduce((sum, check) => sum + (check.responseTimeMs ?? 0), 0) /
              checksWithResponse.length,
          )
        : monitor.lastResponseTime ?? 0;

      const uptimePercent = checks.length
        ? Number(((upChecks / checks.length) * 100).toFixed(2))
        : monitor.isActive && monitor.currentStatus === MonitorStatus.UP
          ? 100
          : 0;

      const lastDowntime = checks
        .slice()
        .reverse()
        .find((check) => check.status === MonitorStatus.DOWN)?.checkedAt;

      return {
        monitor: {
          id: monitor.id,
          name: monitor.name,
          target: monitor.target,
          currentStatus: monitor.currentStatus,
          isActive: monitor.isActive,
        },
        uptimePercent,
        averageResponseTimeMs,
        incidents: monitor.incidents.length,
        openIncidents: monitor.incidents.filter((incident) => incident.status === IncidentStatus.OPEN).length,
        checks: checks.length,
        lastDowntime: lastDowntime?.toISOString() ?? null,
      };
    });

    const checks = rows.reduce((sum, row) => sum + row.checks, 0);
    const incidents = rows.reduce((sum, row) => sum + row.incidents, 0);
    const averageUptimePercent = rows.length
      ? Number((rows.reduce((sum, row) => sum + row.uptimePercent, 0) / rows.length).toFixed(2))
      : 0;
    const rowsWithResponse = rows.filter((row) => row.averageResponseTimeMs > 0);
    const averageResponseTimeMs = rowsWithResponse.length
      ? Math.round(
          rowsWithResponse.reduce((sum, row) => sum + row.averageResponseTimeMs, 0) /
            rowsWithResponse.length,
        )
      : 0;

    return {
      range,
      from: from.toISOString(),
      to: new Date().toISOString(),
      totals: {
        averageUptimePercent,
        averageResponseTimeMs,
        incidents,
        checks,
        monitors: rows.length,
      },
      rows,
    };
  }
}
