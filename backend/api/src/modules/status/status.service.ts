import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IncidentStatus, MonitorStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

const SLA_WINDOW_DAYS = 30;
const SLA_WINDOW_MS = SLA_WINDOW_DAYS * 24 * 60 * 60 * 1000;

type MonitorSnapshot = {
  id: number;
  name: string;
  target: string;
  currentStatus: MonitorStatus;
  lastResponseTime: number | null;
  lastCheckedAt: Date | null;
};

@Injectable()
export class StatusService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicStatus(organizationSlug: string) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(organizationSlug)) {
      throw new BadRequestException('Slug de organizacion invalido');
    }

    const organization = await this.prisma.organization.findUnique({
      where: { slug: organizationSlug },
      select: { id: true, name: true, slug: true },
    });

    if (!organization)
      throw new NotFoundException('Página de estado no encontrada');

    const now = new Date();
    const windowStart = new Date(now.getTime() - SLA_WINDOW_MS);

    const [monitors, checks, activeIncidents, recentIncidents] =
      await Promise.all([
        this.prisma.monitor.findMany({
          where: { organizationId: organization.id, isActive: true },
          select: {
            id: true,
            name: true,
            target: true,
            currentStatus: true,
            lastResponseTime: true,
            lastCheckedAt: true,
          },
          orderBy: { name: 'asc' },
        }),
        this.prisma.checkResult.findMany({
          where: {
            checkedAt: { gte: windowStart },
            monitor: { organizationId: organization.id, isActive: true },
          },
          select: {
            monitorId: true,
            status: true,
            responseTimeMs: true,
            checkedAt: true,
          },
          orderBy: { checkedAt: 'asc' },
        }),
        this.prisma.incident.findMany({
          where: {
            status: { in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED] },
            monitor: { organizationId: organization.id },
          },
          select: {
            id: true,
            title: true,
            status: true,
            severity: true,
            startedAt: true,
            resolvedAt: true,
            durationSeconds: true,
            monitor: { select: { id: true, name: true } },
          },
          orderBy: { startedAt: 'desc' },
          take: 20,
        }),
        this.prisma.incident.findMany({
          where: {
            startedAt: { gte: windowStart },
            monitor: { organizationId: organization.id },
          },
          select: {
            id: true,
            title: true,
            status: true,
            severity: true,
            startedAt: true,
            resolvedAt: true,
            durationSeconds: true,
            monitor: { select: { id: true, name: true } },
          },
          orderBy: { startedAt: 'desc' },
          take: 30,
        }),
      ]);

    const monitorStats = this.buildMonitorStats(monitors, checks);
    const overallStatus = this.getOverallStatus(monitors);
    const summary = this.buildSummary(
      monitors,
      checks,
      activeIncidents,
      recentIncidents,
      now,
    );

    return {
      organization,
      generatedAt: now,
      window: {
        days: SLA_WINDOW_DAYS,
        startedAt: windowStart,
        endedAt: now,
      },
      overallStatus,
      summary,
      monitors: monitorStats,
      openIncidents: activeIncidents,
      recentIncidents,
    };
  }

  private getOverallStatus(monitors: MonitorSnapshot[]) {
    if (
      monitors.some((monitor) => monitor.currentStatus === MonitorStatus.DOWN)
    ) {
      return 'DEGRADED';
    }

    if (
      monitors.some(
        (monitor) => monitor.currentStatus === MonitorStatus.UNKNOWN,
      )
    ) {
      return 'PARTIAL';
    }

    return 'OPERATIONAL';
  }

  private buildMonitorStats(
    monitors: MonitorSnapshot[],
    checks: Array<{
      monitorId: number;
      status: MonitorStatus;
      responseTimeMs: number | null;
      checkedAt: Date;
    }>,
  ) {
    const checksByMonitor = new Map<number, typeof checks>();

    for (const check of checks) {
      const current = checksByMonitor.get(check.monitorId) ?? [];
      current.push(check);
      checksByMonitor.set(check.monitorId, current);
    }

    return monitors.map((monitor) => {
      const monitorChecks = checksByMonitor.get(monitor.id) ?? [];
      const upChecks = monitorChecks.filter(
        (check) => check.status === MonitorStatus.UP,
      ).length;
      const responseTimes = monitorChecks
        .map((check) => check.responseTimeMs)
        .filter((value): value is number => typeof value === 'number');

      return {
        ...monitor,
        sla: {
          uptimePercentage: monitorChecks.length
            ? Number(((upChecks / monitorChecks.length) * 100).toFixed(2))
            : null,
          checks: monitorChecks.length,
          avgResponseTimeMs: responseTimes.length
            ? Math.round(
                responseTimes.reduce((total, value) => total + value, 0) /
                  responseTimes.length,
              )
            : null,
        },
        history: this.buildDailyHistory(monitorChecks),
      };
    });
  }

  private buildDailyHistory(
    checks: Array<{ status: MonitorStatus; checkedAt: Date }>,
  ) {
    const days = new Map<string, { total: number; up: number }>();

    for (const check of checks) {
      const key = check.checkedAt.toISOString().slice(0, 10);
      const current = days.get(key) ?? { total: 0, up: 0 };
      current.total += 1;
      if (check.status === MonitorStatus.UP) current.up += 1;
      days.set(key, current);
    }

    return Array.from(days.entries()).map(([date, value]) => ({
      date,
      uptimePercentage: value.total
        ? Number(((value.up / value.total) * 100).toFixed(2))
        : null,
      checks: value.total,
    }));
  }

  private buildSummary(
    monitors: MonitorSnapshot[],
    checks: Array<{ status: MonitorStatus; responseTimeMs: number | null }>,
    activeIncidents: Array<{ startedAt: Date; durationSeconds: number | null }>,
    recentIncidents: Array<{
      status: IncidentStatus;
      startedAt: Date;
      resolvedAt: Date | null;
      durationSeconds: number | null;
    }>,
    now: Date,
  ) {
    const upChecks = checks.filter(
      (check) => check.status === MonitorStatus.UP,
    ).length;
    const responseTimes = checks
      .map((check) => check.responseTimeMs)
      .filter((value): value is number => typeof value === 'number');

    const downtimeSeconds = recentIncidents.reduce((total, incident) => {
      if (incident.durationSeconds) return total + incident.durationSeconds;
      if (incident.status !== IncidentStatus.RESOLVED) {
        return (
          total +
          Math.max(
            0,
            Math.floor((now.getTime() - incident.startedAt.getTime()) / 1000),
          )
        );
      }
      return total;
    }, 0);

    return {
      totalMonitors: monitors.length,
      operationalMonitors: monitors.filter(
        (monitor) => monitor.currentStatus === MonitorStatus.UP,
      ).length,
      degradedMonitors: monitors.filter(
        (monitor) => monitor.currentStatus === MonitorStatus.DOWN,
      ).length,
      unknownMonitors: monitors.filter(
        (monitor) => monitor.currentStatus === MonitorStatus.UNKNOWN,
      ).length,
      activeIncidents: activeIncidents.length,
      incidentsLast30d: recentIncidents.length,
      checksLast30d: checks.length,
      uptimeLast30d: checks.length
        ? Number(((upChecks / checks.length) * 100).toFixed(2))
        : null,
      avgResponseTimeMs: responseTimes.length
        ? Math.round(
            responseTimes.reduce((total, value) => total + value, 0) /
              responseTimes.length,
          )
        : null,
      downtimeMinutesLast30d: Math.round(downtimeSeconds / 60),
    };
  }
}
