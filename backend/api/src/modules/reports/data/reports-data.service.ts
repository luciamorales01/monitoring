import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildAccessibleMonitorWhere,
  canAccessAllOrganizationMonitors,
  type AuthenticatedUser,
} from '../../../common/monitor-access-scope';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { getRangeStart } from '../helpers/report-period';
import { ReportMetricsService } from '../metrics/report-metrics.service';
import type {
  ReportDataset,
  ReportMonitorInput,
  ReportRange,
} from '../types/report.types';

@Injectable()
export class ReportsDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: ReportMetricsService,
  ) {}

  async getDataset(params: {
    user: AuthenticatedUser;
    range: ReportRange;
    monitorId?: number;
    sectionId?: number;
  }): Promise<ReportDataset> {
    const from = getRangeStart(params.range);
    const to = new Date();

    await this.ensureScopeAccess(
      params.user,
      params.monitorId,
      params.sectionId,
    );

    const [monitors, scopeName] = await Promise.all([
      this.getMonitors(params.user, from, params.monitorId, params.sectionId),
      this.getScopeName(params.monitorId, params.sectionId),
    ]);

    return this.metrics.buildDataset({
      range: params.range,
      from,
      to,
      monitorId: params.monitorId,
      sectionId: params.sectionId,
      monitors,
      scopeName,
    });
  }

  private async ensureScopeAccess(
    user: AuthenticatedUser,
    monitorId?: number,
    sectionId?: number,
  ) {
    const organizationId = user.organizationId;

    if (monitorId) {
      const monitor = await this.prisma.monitor.findFirst({
        where: { id: monitorId, organizationId },
        include: {
          sections: {
            include: { section: { include: { members: true } } },
          },
        },
      });

      if (!monitor) {
        throw new NotFoundException('Monitor no encontrado');
      }

      if (!this.canAccessMonitor(monitor, user)) {
        throw new ForbiddenException(
          'No tienes acceso a los informes de este monitor.',
        );
      }
    }

    if (sectionId) {
      const section = await this.prisma.section.findFirst({
        where: {
          id: sectionId,
          organizationId,
          ...(this.canAccessAllMonitors(user)
            ? {}
            : {
                members: {
                  some: { userId: user.userId },
                },
              }),
        },
        select: { id: true },
      });

      if (!section) {
        throw new NotFoundException('Seccion no encontrada');
      }
    }
  }

  private async getMonitors(
    user: AuthenticatedUser,
    from: Date,
    monitorId?: number,
    sectionId?: number,
  ): Promise<ReportMonitorInput[]> {
    return this.prisma.monitor.findMany({
      where: this.buildMonitorWhere(user, monitorId, sectionId),
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
            monitorId: true,
            status: true,
            severity: true,
            title: true,
            startedAt: true,
            resolvedAt: true,
            durationSeconds: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  private async getScopeName(monitorId?: number, sectionId?: number) {
    if (monitorId) {
      const monitor = await this.prisma.monitor.findUnique({
        where: { id: monitorId },
        select: { name: true },
      });

      return monitor?.name ?? null;
    }

    if (sectionId) {
      const section = await this.prisma.section.findUnique({
        where: { id: sectionId },
        select: { name: true },
      });

      return section?.name ?? null;
    }

    return null;
  }

  private buildMonitorWhere(
    user: AuthenticatedUser,
    monitorId?: number,
    sectionId?: number,
  ): Prisma.MonitorWhereInput {
    const filters: Prisma.MonitorWhereInput[] = [
      buildAccessibleMonitorWhere(user),
    ];

    if (monitorId) {
      filters.push({ id: monitorId });
    }

    if (sectionId) {
      filters.push({
        sections: {
          some: { sectionId },
        },
      });
    }

    return filters.length === 1 ? filters[0] : { AND: filters };
  }

  private canAccessMonitor(
    monitor: {
      organizationId: number;
      sections?: { section: { members: { userId: number }[] } }[];
    },
    user: AuthenticatedUser,
  ) {
    if (monitor.organizationId !== user.organizationId) return false;
    if (this.canAccessAllMonitors(user)) return true;
    return (
      monitor.sections?.some(({ section }) =>
        section.members.some((member) => member.userId === user.userId),
      ) ?? false
    );
  }

  private canAccessAllMonitors(user: AuthenticatedUser) {
    return canAccessAllOrganizationMonitors(user);
  }
}
