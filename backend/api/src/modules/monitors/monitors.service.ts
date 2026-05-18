import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildAccessibleMonitorWhere,
  canAccessAllOrganizationMonitors,
  type AuthenticatedUser,
} from '../../common/monitor-access-scope';
import { PrismaService } from '../../database/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { MonitoringEventName } from '../events/events.types';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMonitorDto } from './create-monitor.dto';
import {
  ListMonitorsQueryDto,
  type MonitorListSortOption,
} from './list-monitors-query.dto';
import { MonitorCheckRunnerService } from './monitor-check-runner.service';
import { MonitorIncidentSyncService } from './monitor-incident-sync.service';
import { MonitorTargetValidatorService } from './monitor-target-validator.service';
import {
  buildGlobalErrorMessage,
  getAverageResponseTime,
  getLatestCheckedAt,
  getOverallMonitorStatus,
} from './monitors.service.helpers';
import { monitorListSelect } from './monitors.service.queries';
import {
  type MonitorCheckBatchResult,
  type MonitorCheckOutcome,
  type MonitorEntity,
  type PersistedCheckResult,
} from './monitors.service.types';
import { UpdateMonitorDto } from './update-monitor.dto';

@Injectable()
export class MonitorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly eventsService: EventsService,
    private readonly targetValidator: MonitorTargetValidatorService,
    private readonly checkRunner: MonitorCheckRunnerService,
    private readonly incidentSync: MonitorIncidentSyncService,
  ) {}

  async create(dto: CreateMonitorDto, user: AuthenticatedUser) {
    await this.targetValidator.assertAllowedTarget(dto.target);

    return this.prisma.monitor.create({
      data: {
        name: dto.name,
        type: dto.type,
        target: dto.target,
        expectedStatusCode: dto.expectedStatusCode ?? 200,
        frequencySeconds: dto.frequencySeconds ?? 60,
        timeoutSeconds: dto.timeoutSeconds ?? 10,
        alertEmail: dto.alertEmail ?? true,
        alertThreshold: dto.alertThreshold ?? 3,
        organizationId: user.organizationId,
        createdById: user.userId,
      },
    });
  }

  async findAll(user: AuthenticatedUser, query: ListMonitorsQueryDto = {}) {
    const limit = query.limit ?? 10;
    const requestedPage = query.page ?? 1;
    const where = this.buildMonitorListWhere(user, query);
    const total = await this.prisma.monitor.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requestedPage, totalPages);

    const items = await this.prisma.monitor.findMany({
      where,
      select: monitorListSelect,
      orderBy: this.buildMonitorListOrderBy(query.sort),
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const monitor = await this.prisma.monitor.findUnique({
      where: { id },
      include: {
        checkResults: {
          orderBy: { checkedAt: 'desc' },
          take: 20,
        },
        sections: {
          include: { section: { include: { members: true } } },
          orderBy: { assignedAt: 'asc' },
        },
      },
    });

    if (!monitor) {
      throw new NotFoundException('Monitor no encontrado');
    }

    this.ensureMonitorAccess(monitor, user);

    return monitor;
  }

  async runCheck(id: number, user: AuthenticatedUser) {
    const monitor = await this.findMonitorByIdOrThrow(id);
    this.ensureMonitorAccess(monitor, user);

    const outcomes = await this.checkRunner.executeMonitorChecks(monitor);

    return this.persistCheckResults(monitor, outcomes);
  }

  async update(id: number, dto: UpdateMonitorDto, user: AuthenticatedUser) {
    const monitor = await this.findMonitorByIdOrThrow(id);
    this.ensureMonitorAccess(monitor, user);

    const data: Record<string, unknown> = {};
    const scheduleFieldsChanged = this.hasMonitorScheduleChange(dto);

    if (dto.target !== undefined || dto.type !== undefined) {
      await this.targetValidator.assertAllowedTarget(
        dto.target ?? monitor.target,
      );
    }

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.target !== undefined) data.target = dto.target;
    if (dto.expectedStatusCode !== undefined) {
      data.expectedStatusCode = dto.expectedStatusCode;
    }
    if (dto.frequencySeconds !== undefined) {
      data.frequencySeconds = dto.frequencySeconds;
      if (monitor.isActive) {
        data.nextCheckAt = new Date(Date.now() + dto.frequencySeconds * 1000);
      }
    }
    if (dto.timeoutSeconds !== undefined) {
      data.timeoutSeconds = dto.timeoutSeconds;
    }
    if (dto.alertEmail !== undefined) data.alertEmail = dto.alertEmail;
    if (dto.alertThreshold !== undefined) {
      data.alertThreshold = dto.alertThreshold;
    }

    if (scheduleFieldsChanged && this.monitorHasSection(monitor)) {
      data.usesSectionSchedule = this.matchesPrimarySectionSchedule({
        ...monitor,
        expectedStatusCode:
          dto.expectedStatusCode ?? monitor.expectedStatusCode,
        frequencySeconds: dto.frequencySeconds ?? monitor.frequencySeconds,
        timeoutSeconds: dto.timeoutSeconds ?? monitor.timeoutSeconds,
      });
    }

    const updatedMonitor = await this.prisma.monitor.update({
      where: { id },
      data,
      include: {
        sections: {
          include: { section: { include: { members: true } } },
          orderBy: { assignedAt: 'asc' },
        },
      },
    });

    return updatedMonitor;
  }

  async useSectionSchedule(id: number, user: AuthenticatedUser) {
    const monitor = await this.findMonitorByIdOrThrow(id);
    this.ensureMonitorAccess(monitor, user);
    const section = monitor.sections?.[0]?.section;

    if (!section) {
      throw new BadRequestException(
        'El monitor no pertenece a ninguna sección',
      );
    }

    return this.prisma.monitor.update({
      where: { id },
      data: {
        expectedStatusCode: section.expectedStatusCode,
        frequencySeconds: section.frequencySeconds,
        timeoutSeconds: section.timeoutSeconds,
        isActive: section.isActive,
        usesSectionSchedule: true,
        nextCheckAt: section.isActive ? new Date() : undefined,
      },
      include: {
        sections: {
          include: { section: { include: { members: true } } },
          orderBy: { assignedAt: 'asc' },
        },
      },
    });
  }

  async toggleActive(id: number, user: AuthenticatedUser) {
    const monitor = await this.findMonitorByIdOrThrow(id);
    this.ensureMonitorAccess(monitor, user);
    const nextIsActive = !monitor.isActive;

    return this.prisma.monitor.update({
      where: { id },
      data: {
        isActive: nextIsActive,
        ...(nextIsActive ? { nextCheckAt: new Date() } : {}),
      },
    });
  }

  async runAutomatedCheck(id: number) {
    const monitor = await this.findMonitorById(id);

    if (!monitor || !monitor.isActive) {
      return null;
    }

    const outcomes = await this.checkRunner.executeMonitorChecks(monitor);

    return this.persistCheckResults(monitor, outcomes);
  }

  async findDueActiveMonitorIds(): Promise<number[]> {
    const dueMonitors = await this.prisma.monitor.findMany({
      where: {
        isActive: true,
        nextCheckAt: {
          lte: new Date(),
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        nextCheckAt: 'asc',
      },
    });

    return dueMonitors.map((monitor) => monitor.id);
  }

  async remove(id: number, user: AuthenticatedUser) {
    const monitor = await this.findMonitorByIdOrThrow(id);
    this.ensureMonitorAccess(monitor, user);

    return this.prisma.monitor.delete({
      where: { id },
    });
  }

  async findRecentChecks(
    id: number,
    user: AuthenticatedUser,
    order: 'asc' | 'desc' = 'desc',
  ) {
    const monitor = await this.findMonitorByIdOrThrow(id);
    this.ensureMonitorAccess(monitor, user);

    const results = await this.prisma.checkResult.findMany({
      where: {
        monitorId: id,
      },
      orderBy: {
        checkedAt: order === 'asc' ? 'asc' : 'desc',
      },
      take: 50,
    });

    return results;
  }

  private buildMonitorListWhere(
    user: AuthenticatedUser,
    query: ListMonitorsQueryDto,
  ): Prisma.MonitorWhereInput {
    const search = query.search?.trim();
    const where: Prisma.MonitorWhereInput = {
      ...buildAccessibleMonitorWhere(user),
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { target: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.status && query.status !== 'ALL') {
      if (query.status === 'PAUSED') {
        where.isActive = false;
      } else {
        where.isActive = true;
        where.currentStatus = query.status;
      }
    }

    if (query.type) {
      where.type = query.type;
    }

    return where;
  }

  private buildMonitorListOrderBy(
    sort: MonitorListSortOption = 'status',
  ): Prisma.MonitorOrderByWithRelationInput[] {
    if (sort === 'name') {
      return [{ name: 'asc' }, { id: 'asc' }];
    }

    if (sort === 'latest-check') {
      return [{ lastCheckedAt: 'desc' }, { name: 'asc' }, { id: 'asc' }];
    }

    if (sort === 'created-at') {
      return [{ createdAt: 'desc' }, { id: 'desc' }];
    }

    return [
      { currentStatus: 'asc' },
      { isActive: 'desc' },
      { name: 'asc' },
      { id: 'asc' },
    ];
  }

  private async persistCheckResults(
    monitor: Pick<
      MonitorEntity,
      | 'id'
      | 'frequencySeconds'
      | 'name'
      | 'target'
      | 'organizationId'
      | 'currentStatus'
      | 'alertThreshold'
      | 'alertEmail'
    >,
    outcomes: MonitorCheckOutcome[],
  ): Promise<MonitorCheckBatchResult> {
    const nextCheckAt = new Date(Date.now() + monitor.frequencySeconds * 1000);
    const overallStatus = getOverallMonitorStatus(outcomes);
    const latestCheckedAt = getLatestCheckedAt(outcomes);
    const averageResponseTime = getAverageResponseTime(outcomes);
    const previousStatus = monitor.currentStatus ?? null;

    const persisted = await this.prisma.$transaction(async (tx) => {
      const results = await Promise.all(
        outcomes.map((outcome) =>
          tx.checkResult.create({
            data: {
              monitorId: monitor.id,
              status: outcome.status,
              responseTimeMs: outcome.responseTimeMs,
              statusCode: outcome.statusCode,
              errorMessage: outcome.errorMessage,
              checkedAt: outcome.checkedAt,
            },
          }),
        ),
      );

      await tx.monitor.update({
        where: { id: monitor.id },
        data: {
          currentStatus: overallStatus,
          lastResponseTime: averageResponseTime,
          lastCheckedAt: latestCheckedAt,
          nextCheckAt,
        },
      });

      const incidentSync = await this.incidentSync.syncIncidentForCheck(
        tx,
        monitor,
        {
          checkedAt: latestCheckedAt,
          errorMessage: buildGlobalErrorMessage(outcomes),
          responseTimeMs: averageResponseTime ?? 0,
          status: overallStatus,
          statusCode: null,
        },
      );

      return {
        checkedAt: latestCheckedAt,
        incidentSync,
        overallStatus,
        previousStatus,
        results,
      } satisfies PersistedCheckResult;
    });

    await this.publishCheckEvents(
      monitor.id,
      monitor.organizationId,
      persisted,
    );
    await this.enqueueIncidentNotifications(monitor, persisted);

    return {
      overallStatus: persisted.overallStatus,
      results: persisted.results,
    };
  }

  private async enqueueIncidentNotifications(
    monitor: Pick<
      MonitorEntity,
      'id' | 'name' | 'target' | 'organizationId' | 'alertEmail'
    >,
    result: PersistedCheckResult,
  ) {
    const incidentSync = result.incidentSync;

    if (!incidentSync?.shouldNotify || monitor.alertEmail === false) {
      return;
    }

    const basePayload = {
      incidentId: incidentSync.incidentId,
      monitorId: monitor.id,
      monitorName: monitor.name ?? `Monitor #${monitor.id}`,
      monitorTarget: monitor.target,
      organizationId: monitor.organizationId,
      severity: incidentSync.severity,
      title: incidentSync.title,
    };

    if (incidentSync.type === 'created') {
      await this.notificationsService.notifyMonitorDown({
        ...basePayload,
        errorMessage: incidentSync.errorMessage,
        startedAt: incidentSync.happenedAt,
      });
      return;
    }

    await this.notificationsService.notifyMonitorRecovered({
      ...basePayload,
      resolvedAt: incidentSync.happenedAt,
    });
  }

  private async publishCheckEvents(
    monitorId: number,
    organizationId: number,
    result: PersistedCheckResult,
  ) {
    const checkedAt = result.checkedAt.toISOString();

    await this.eventsService.publish({
      name: MonitoringEventName.MONITOR_CHECKED,
      payload: {
        checkedAt,
        monitorId,
        organizationId,
        previousStatus: result.previousStatus,
        status: result.overallStatus,
      },
    });

    if (
      result.previousStatus !== null &&
      result.previousStatus !== result.overallStatus
    ) {
      await this.eventsService.publish({
        name: MonitoringEventName.MONITOR_STATUS_CHANGED,
        payload: {
          checkedAt,
          monitorId,
          organizationId,
          previousStatus: result.previousStatus,
          status: result.overallStatus,
        },
      });
    }

    if (result.incidentSync?.type === 'created') {
      await this.eventsService.publish({
        name: MonitoringEventName.INCIDENT_CREATED,
        payload: {
          incidentId: result.incidentSync.incidentId,
          monitorId,
          organizationId,
          startedAt: result.incidentSync.happenedAt.toISOString(),
        },
      });
    }

    if (result.incidentSync?.type === 'resolved') {
      await this.eventsService.publish({
        name: MonitoringEventName.INCIDENT_RESOLVED,
        payload: {
          incidentId: result.incidentSync.incidentId,
          monitorId,
          organizationId,
          resolvedAt: result.incidentSync.happenedAt.toISOString(),
        },
      });
    }
  }

  private findMonitorById(id: number): Promise<MonitorEntity | null> {
    return this.prisma.monitor.findUnique({
      where: { id },
      include: {
        sections: {
          include: { section: { include: { members: true } } },
          orderBy: { assignedAt: 'asc' },
        },
      },
    });
  }

  private async findMonitorByIdOrThrow(id: number): Promise<MonitorEntity> {
    const monitor = await this.findMonitorById(id);

    if (!monitor) {
      throw new NotFoundException('Monitor no encontrado');
    }

    return monitor;
  }

  private ensureMonitorAccess(monitor: MonitorEntity, user: AuthenticatedUser) {
    if (monitor.organizationId !== user.organizationId) {
      throw new ForbiddenException('No tienes acceso a este monitor');
    }
    if (this.canAccessAllMonitors(user)) return;
    if (
      monitor.sections?.some(({ section }) =>
        section.members?.some((member) => member.userId === user.userId),
      )
    ) {
      return;
    }
    throw new ForbiddenException(
      'No tienes acceso a este monitor porque no pertenece a ninguna de tus secciones.',
    );
  }

  private canAccessAllMonitors(user: AuthenticatedUser) {
    return canAccessAllOrganizationMonitors(user);
  }

  private buildSectionMembershipMonitorFilter(
    user: AuthenticatedUser,
  ): Prisma.MonitorWhereInput {
    return buildAccessibleMonitorWhere(user);
  }

  private monitorHasSection(monitor: MonitorEntity) {
    return (monitor.sections?.length ?? 0) > 0;
  }

  private hasMonitorScheduleChange(dto: UpdateMonitorDto) {
    return (
      dto.expectedStatusCode !== undefined ||
      dto.frequencySeconds !== undefined ||
      dto.timeoutSeconds !== undefined
    );
  }

  private matchesPrimarySectionSchedule(monitor: MonitorEntity) {
    const section = monitor.sections?.[0]?.section;
    if (!section) return false;
    return (
      monitor.expectedStatusCode === section.expectedStatusCode &&
      monitor.frequencySeconds === section.frequencySeconds &&
      monitor.timeoutSeconds === section.timeoutSeconds
    );
  }
}
