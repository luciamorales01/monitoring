import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CheckResult,
  IncidentStatus,
  Monitor,
  MonitorStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateMonitorDto } from './create-monitor.dto';
import { UpdateMonitorDto } from './update-monitor.dto';

type AuthenticatedUser = {
  organizationId: number;
  userId: number;
};

type MonitorCheckOutcome = {
  checkedAt: Date;
  errorMessage: string | null;
  location: string;
  responseTimeMs: number;
  status: MonitorStatus;
  statusCode: number | null;
};

type MonitorCheckBatchResult = {
  overallStatus: MonitorStatus;
  results: CheckResult[];
};

@Injectable()
export class MonitorsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateMonitorDto, user: AuthenticatedUser) {
    return this.prisma.monitor.create({
      data: {
        name: dto.name,
        type: dto.type,
        target: dto.target,
        expectedStatusCode: dto.expectedStatusCode ?? 200,
        frequencySeconds: dto.frequencySeconds ?? 60,
        timeoutSeconds: dto.timeoutSeconds ?? 10,
        locations: this.sanitizeConfiguredLocations(dto.locations),
        alertEmail: dto.alertEmail ?? true,
        alertPush: dto.alertPush ?? false,
        alertThreshold: dto.alertThreshold ?? 3,
        organizationId: user.organizationId,
        createdById: user.userId,
      },
    });
  }

  findAll(user: AuthenticatedUser) {
    return this.prisma.monitor.findMany({
      where: {
        organizationId: user.organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const monitor = await this.prisma.monitor.findUnique({
      where: { id },
      include: {
        checkResults: {
          orderBy: { checkedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!monitor) {
      throw new NotFoundException('Monitor no encontrado');
    }

    if (monitor.organizationId !== user.organizationId) {
      throw new ForbiddenException('No tienes acceso a este monitor');
    }

    return monitor;
  }

  async runCheck(id: number, user: AuthenticatedUser) {
    const monitor = await this.findMonitorByIdOrThrow(id);
    this.ensureMonitorAccess(monitor.organizationId, user);
    const outcomes = await this.executeMonitorChecks(monitor);

    return this.persistCheckResults(monitor, outcomes);
  }

  async update(id: number, dto: UpdateMonitorDto, user: AuthenticatedUser) {
    const monitor = await this.findMonitorByIdOrThrow(id);
    this.ensureMonitorAccess(monitor.organizationId, user);

    const data: Prisma.MonitorUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.target !== undefined) data.target = dto.target;
    if (dto.expectedStatusCode !== undefined) {
      data.expectedStatusCode = dto.expectedStatusCode;
    }
    if (dto.frequencySeconds !== undefined) {
      data.frequencySeconds = dto.frequencySeconds;
    }
    if (dto.timeoutSeconds !== undefined) {
      data.timeoutSeconds = dto.timeoutSeconds;
    }
    if (dto.locations !== undefined) {
      data.locations = this.sanitizeConfiguredLocations(dto.locations);
    }
    if (dto.alertEmail !== undefined) data.alertEmail = dto.alertEmail;
    if (dto.alertPush !== undefined) data.alertPush = dto.alertPush;
    if (dto.alertThreshold !== undefined) {
      data.alertThreshold = dto.alertThreshold;
    }

    return this.prisma.monitor.update({
      where: { id },
      data,
    });
  }

  async toggleActive(id: number, user: AuthenticatedUser) {
    const monitor = await this.findMonitorByIdOrThrow(id);
    this.ensureMonitorAccess(monitor.organizationId, user);

    return this.prisma.monitor.update({
      where: { id },
      data: {
        isActive: !monitor.isActive,
      },
    });
  }

  async runAutomatedCheck(id: number) {
    const monitor = await this.findMonitorById(id);

    if (!monitor || !monitor.isActive) {
      return null;
    }

    const outcomes = await this.executeMonitorChecks(monitor);

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
    this.ensureMonitorAccess(monitor.organizationId, user);

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
    this.ensureMonitorAccess(monitor.organizationId, user);

    return this.prisma.checkResult.findMany({
      where: {
        monitorId: id,
      },
      orderBy: {
        checkedAt: order === 'asc' ? 'asc' : 'desc',
      },
      take: 50,
    });
  }

  private async executeMonitorChecks(
    monitor: Monitor,
  ): Promise<MonitorCheckOutcome[]> {
    const locations = this.normalizeLocations(monitor.locations);

    return Promise.all(
      locations.map((location) => this.executeHttpCheck(monitor, location)),
    );
  }

  private async executeHttpCheck(
    monitor: Monitor,
    location: string,
  ): Promise<MonitorCheckOutcome> {
    const checkedAt = new Date();
    const startTime = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      monitor.timeoutSeconds * 1000,
    );

    try {
      const response = await fetch(monitor.target, {
        method: 'GET',
        signal: controller.signal,
      });
      const isUp = response.status === monitor.expectedStatusCode;
      const responseTimeMs = Math.round(performance.now() - startTime);

      return {
        checkedAt,
        errorMessage: isUp
          ? null
          : `Codigo esperado ${monitor.expectedStatusCode}, recibido ${response.status}`,
        location,
        responseTimeMs,
        status: isUp ? MonitorStatus.UP : MonitorStatus.DOWN,
        statusCode: response.status,
      };
    } catch (error: unknown) {
      return {
        checkedAt,
        errorMessage: this.getMonitorCheckErrorMessage(
          error,
          monitor.timeoutSeconds,
        ),
        location,
        responseTimeMs: Math.round(performance.now() - startTime),
        status: MonitorStatus.DOWN,
        statusCode: null,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async persistCheckResults(
    monitor: Pick<
      Monitor,
      'id' | 'frequencySeconds' | 'name' | 'alertThreshold' | 'locations'
    >,
    outcomes: MonitorCheckOutcome[],
  ): Promise<MonitorCheckBatchResult> {
    const nextCheckAt = new Date(Date.now() + monitor.frequencySeconds * 1000);
    const overallStatus = this.getOverallMonitorStatus(outcomes);
    const latestCheckedAt = this.getLatestCheckedAt(outcomes);
    const averageResponseTime = this.getAverageResponseTime(outcomes);

    return this.prisma.$transaction(async (tx) => {
      const results = await Promise.all(
        outcomes.map((outcome) =>
          tx.checkResult.create({
            data: {
              monitorId: monitor.id,
              status: outcome.status,
              responseTimeMs: outcome.responseTimeMs,
              statusCode: outcome.statusCode,
              errorMessage: outcome.errorMessage,
              location: outcome.location,
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

      await this.syncIncidentForCheck(
        tx,
        monitor,
        {
          checkedAt: latestCheckedAt,
          errorMessage: this.buildGlobalErrorMessage(outcomes),
          location: 'default',
          responseTimeMs: averageResponseTime ?? 0,
          status: overallStatus,
          statusCode: null,
        },
        outcomes,
      );

      return {
        overallStatus,
        results,
      };
    });
  }

  private getOverallMonitorStatus(
    outcomes: MonitorCheckOutcome[],
  ): MonitorStatus {
    if (
      outcomes.length === 0 ||
      outcomes.every((outcome) => outcome.status === MonitorStatus.UNKNOWN)
    ) {
      return MonitorStatus.UNKNOWN;
    }

    if (outcomes.some((outcome) => outcome.status === MonitorStatus.DOWN)) {
      return MonitorStatus.DOWN;
    }

    if (outcomes.every((outcome) => outcome.status === MonitorStatus.UP)) {
      return MonitorStatus.UP;
    }

    return MonitorStatus.UNKNOWN;
  }

  private getLatestCheckedAt(outcomes: MonitorCheckOutcome[]) {
    return outcomes.reduce(
      (latest, outcome) =>
        outcome.checkedAt.getTime() > latest.getTime()
          ? outcome.checkedAt
          : latest,
      outcomes[0]?.checkedAt ?? new Date(),
    );
  }

  private getAverageResponseTime(outcomes: MonitorCheckOutcome[]) {
    const responseTimes = outcomes
      .map((outcome) => outcome.responseTimeMs)
      .filter((value): value is number => Number.isFinite(value));

    if (responseTimes.length === 0) {
      return null;
    }

    return Math.round(
      responseTimes.reduce((sum, value) => sum + value, 0) /
        responseTimes.length,
    );
  }

  private buildGlobalErrorMessage(outcomes: MonitorCheckOutcome[]) {
    const errors = outcomes
      .filter(
        (outcome) =>
          outcome.status === MonitorStatus.DOWN && outcome.errorMessage,
      )
      .map((outcome) => `${outcome.location}: ${outcome.errorMessage}`);

    return errors.length > 0 ? errors.join(' | ') : null;
  }

  private normalizeLocations(locations?: string[] | null) {
    const normalized = this.sanitizeConfiguredLocations(locations);

    return normalized.length > 0 ? normalized : ['default'];
  }

  private sanitizeConfiguredLocations(locations?: string[] | null) {
    const normalized = (locations ?? [])
      .map((location) => location.trim())
      .filter((location) => location.length > 0);

    return Array.from(new Set(normalized));
  }

  private getAlertThreshold(alertThreshold?: number | null) {
    return Math.max(1, alertThreshold ?? 3);
  }

  private getBatchStatus(
    results: Array<Pick<CheckResult, 'status'>>,
  ): MonitorStatus {
    if (results.some((result) => result.status === MonitorStatus.DOWN)) {
      return MonitorStatus.DOWN;
    }

    if (results.every((result) => result.status === MonitorStatus.UP)) {
      return MonitorStatus.UP;
    }

    return MonitorStatus.UNKNOWN;
  }

  private getRecentCheckBatches(
    results: CheckResult[],
    batchSize: number,
  ): CheckResult[][] {
    const batches: CheckResult[][] = [];

    for (let index = 0; index < results.length; index += batchSize) {
      const batch = results.slice(index, index + batchSize);

      if (batch.length < batchSize) {
        break;
      }

      batches.push(batch);
    }

    return batches;
  }

  private getConsecutiveDownBatches(
    results: CheckResult[],
    batchSize: number,
  ): CheckResult[][] {
    const batches = this.getRecentCheckBatches(results, batchSize);
    const consecutiveDownBatches: CheckResult[][] = [];

    for (const batch of batches) {
      if (this.getBatchStatus(batch) !== MonitorStatus.DOWN) {
        break;
      }

      consecutiveDownBatches.push(batch);
    }

    return consecutiveDownBatches;
  }

  private getIncidentStartedAt(batches: CheckResult[][], fallback: Date) {
    const oldestBatch = batches.at(-1);

    if (!oldestBatch || oldestBatch.length === 0) {
      return fallback;
    }

    return oldestBatch.reduce(
      (earliest, result) =>
        result.checkedAt.getTime() < earliest.getTime()
          ? result.checkedAt
          : earliest,
      oldestBatch[0].checkedAt,
    );
  }

  private formatLocationName(location: string) {
    return location
      .replace(/[-_]+/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 0)
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
      .join(' ');
  }

  private buildIncidentTitle(outcomes: MonitorCheckOutcome[]) {
    const failingLocations = Array.from(
      new Set(
        outcomes
          .filter((outcome) => outcome.status === MonitorStatus.DOWN)
          .map((outcome) => outcome.location)
          .filter(
            (location): location is string =>
              Boolean(location) && location !== 'default',
          ),
      ),
    );

    if (failingLocations.length === 0) {
      return 'Monitor caído';
    }

    return `Monitor caído en ${failingLocations
      .map((location) => this.formatLocationName(location))
      .join(', ')}`;
  }

  private async syncIncidentForCheck(
    tx: Prisma.TransactionClient,
    monitor: Pick<Monitor, 'id' | 'alertThreshold' | 'locations'>,
    outcome: MonitorCheckOutcome,
    outcomes: MonitorCheckOutcome[],
  ) {
    const openIncident = await tx.incident.findFirst({
      where: {
        monitorId: monitor.id,
        status: IncidentStatus.OPEN,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (outcome.status === MonitorStatus.DOWN) {
      if (openIncident) {
        return;
      }

      const batchSize = this.normalizeLocations(monitor.locations).length;
      const alertThreshold = this.getAlertThreshold(monitor.alertThreshold);
      const recentResults = await tx.checkResult.findMany({
        where: {
          monitorId: monitor.id,
        },
        orderBy: {
          checkedAt: 'desc',
        },
        take: batchSize * alertThreshold,
      });
      const consecutiveDownBatches = this.getConsecutiveDownBatches(
        recentResults,
        batchSize,
      );

      if (consecutiveDownBatches.length < alertThreshold) {
        return;
      }

      await tx.incident.create({
        data: {
          monitorId: monitor.id,
          status: IncidentStatus.OPEN,
          title: this.buildIncidentTitle(outcomes),
          startedAt: this.getIncidentStartedAt(
            consecutiveDownBatches,
            outcome.checkedAt,
          ),
        },
      });

      return;
    }

    if (!openIncident) {
      return;
    }

    await tx.incident.update({
      where: {
        id: openIncident.id,
      },
      data: {
        status: IncidentStatus.RESOLVED,
        resolvedAt: outcome.checkedAt,
        durationSeconds: Math.max(
          0,
          Math.floor(
            (outcome.checkedAt.getTime() - openIncident.startedAt.getTime()) /
              1000,
          ),
        ),
      },
    });
  }

  private findMonitorById(id: number) {
    return this.prisma.monitor.findUnique({
      where: { id },
    });
  }

  private async findMonitorByIdOrThrow(id: number) {
    const monitor = await this.findMonitorById(id);

    if (!monitor) {
      throw new NotFoundException('Monitor no encontrado');
    }

    return monitor;
  }

  private ensureMonitorAccess(organizationId: number, user: AuthenticatedUser) {
    if (organizationId !== user.organizationId) {
      throw new ForbiddenException('No tienes acceso a este monitor');
    }
  }

  private getMonitorCheckErrorMessage(
    error: unknown,
    timeoutSeconds: number,
  ): string {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return `Timeout tras ${timeoutSeconds} segundos`;
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Error desconocido';
  }
}
