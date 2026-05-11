import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  lookup,
  resolve4,
  resolve6,
  resolveCname,
  resolveMx,
  resolveTxt,
} from 'node:dns/promises';
import { isIP, Socket } from 'node:net';
import { connect as tlsConnect, type PeerCertificate } from 'node:tls';
import { Prisma } from '@prisma/client';
import { buildAccessibleMonitorWhere, canAccessAllOrganizationMonitors, type AuthenticatedUser } from '../../common/monitor-access-scope';
import { PrismaService } from '../../database/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { MonitoringEventName } from '../events/events.types';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMonitorDto } from './create-monitor.dto';
import {
  ListMonitorsQueryDto,
  type MonitorListSortOption,
} from './list-monitors-query.dto';
import { UpdateMonitorDto } from './update-monitor.dto';

const MonitorStatus = {
  UP: 'UP',
  DOWN: 'DOWN',
  UNKNOWN: 'UNKNOWN',
} as const;

const IncidentStatus = {
  OPEN: 'OPEN',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESOLVED: 'RESOLVED',
} as const;

type MonitorStatusValue = (typeof MonitorStatus)[keyof typeof MonitorStatus];

type MonitorEntity = {
  id: number;
  name?: string;
  type: string;
  target: string;
  expectedStatusCode: number;
  frequencySeconds: number;
  timeoutSeconds: number;
  organizationId: number;
  currentStatus?: MonitorStatusValue | null;
  isActive?: boolean;
  locations?: string[] | null;
  alertThreshold?: number | null;
  alertEmail?: boolean | null;
  tcpPort?: number | null;
  keyword?: string | null;
  sslWarningDays?: number | null;
  dnsRecordType?: string | null;
  dnsExpectedValue?: string | null;
  usesSectionSchedule?: boolean | null;
  sections?: {
    section: {
      id: number;
      expectedStatusCode: number;
      frequencySeconds: number;
      timeoutSeconds: number;
      locations: string[];
      isActive: boolean;
      members?: { userId: number }[];
    };
  }[];
};

type CheckResultEntity = {
  id?: number;
  monitorId?: number;
  status: MonitorStatusValue;
  checkedAt: Date;
  location?: string | null;
};

type MonitorCheckOutcome = {
  checkedAt: Date;
  errorMessage: string | null;
  location: string;
  responseTimeMs: number;
  status: MonitorStatusValue;
  statusCode: number | null;
};

type MonitorCheckBatchResult = {
  overallStatus: MonitorStatusValue;
  results: unknown[];
};

type IncidentSyncResult =
  | { type: 'created'; incidentId: number; happenedAt: Date }
  | { type: 'resolved'; incidentId: number; happenedAt: Date }
  | null;

type PersistedCheckResult = MonitorCheckBatchResult & {
  checkedAt: Date;
  incidentSync: IncidentSyncResult;
  previousStatus: MonitorStatusValue | null;
};

const monitorListSelect = {
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
  locations: true,
  alertEmail: true,
  alertPush: true,
  alertThreshold: true,
  tcpPort: true,
  keyword: true,
  sslWarningDays: true,
  dnsRecordType: true,
  dnsExpectedValue: true,
} satisfies Prisma.MonitorSelect;

@Injectable()
export class MonitorsService {
  private readonly logger = new Logger(MonitorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly eventsService: EventsService,
  ) {}

  async create(dto: CreateMonitorDto, user: AuthenticatedUser) {
    await this.assertAllowedTarget(dto.type, dto.target, dto.tcpPort);

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
        tcpPort: dto.tcpPort ?? null,
        keyword: dto.keyword?.trim() || null,
        sslWarningDays: dto.sslWarningDays ?? 14,
        dnsRecordType: dto.dnsRecordType?.trim().toUpperCase() || 'A',
        dnsExpectedValue: dto.dnsExpectedValue?.trim() || null,
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
        sections: { include: { section: { include: { members: true } } }, orderBy: { assignedAt: 'asc' } },
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

    const outcomes = await this.executeMonitorChecks(monitor);

    return this.persistCheckResults(monitor, outcomes);
  }

  async update(id: number, dto: UpdateMonitorDto, user: AuthenticatedUser) {
    const monitor = await this.findMonitorByIdOrThrow(id);
    this.ensureMonitorAccess(monitor, user);

    const data: Record<string, unknown> = {};
    const scheduleFieldsChanged = this.hasMonitorScheduleChange(dto);

    if (
      dto.target !== undefined ||
      dto.type !== undefined ||
      dto.tcpPort !== undefined
    ) {
      await this.assertAllowedTarget(
        dto.type ?? monitor.type,
        dto.target ?? monitor.target,
        dto.tcpPort ?? monitor.tcpPort ?? undefined,
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
    if (dto.locations !== undefined) {
      data.locations = this.sanitizeConfiguredLocations(dto.locations);
    }
    if (dto.alertEmail !== undefined) data.alertEmail = dto.alertEmail;
    if (dto.alertPush !== undefined) data.alertPush = dto.alertPush;
    if (dto.alertThreshold !== undefined) {
      data.alertThreshold = dto.alertThreshold;
    }
    if (dto.tcpPort !== undefined) data.tcpPort = dto.tcpPort;
    if (dto.keyword !== undefined) {
      data.keyword =
        typeof dto.keyword === 'string' && dto.keyword.trim().length > 0
          ? dto.keyword.trim()
          : null;
    }

    if (dto.sslWarningDays !== undefined) {
      data.sslWarningDays =
        dto.sslWarningDays === null ? 14 : Number(dto.sslWarningDays);
    }

    if (dto.dnsRecordType !== undefined) {
      data.dnsRecordType =
        typeof dto.dnsRecordType === 'string' &&
        dto.dnsRecordType.trim().length > 0
          ? dto.dnsRecordType.trim().toUpperCase()
          : 'A';
    }

    if (dto.dnsExpectedValue !== undefined) {
      data.dnsExpectedValue =
        typeof dto.dnsExpectedValue === 'string' &&
        dto.dnsExpectedValue.trim().length > 0
          ? dto.dnsExpectedValue.trim()
          : null;
    }

    if (scheduleFieldsChanged && this.monitorHasSection(monitor)) {
      data.usesSectionSchedule = this.matchesPrimarySectionSchedule({
        ...monitor,
        expectedStatusCode:
          dto.expectedStatusCode ?? monitor.expectedStatusCode,
        frequencySeconds: dto.frequencySeconds ?? monitor.frequencySeconds,
        timeoutSeconds: dto.timeoutSeconds ?? monitor.timeoutSeconds,
        locations:
          dto.locations !== undefined
            ? this.sanitizeConfiguredLocations(dto.locations)
            : (monitor.locations ?? []),
      });
    }

    return this.prisma.monitor.update({
      where: { id },
      data,
      include: { sections: { include: { section: { include: { members: true } } }, orderBy: { assignedAt: 'asc' } } },
    });
  }

  async useSectionSchedule(id: number, user: AuthenticatedUser) {
    const monitor = await this.findMonitorByIdOrThrow(id);
    this.ensureMonitorAccess(monitor, user);
    const section = monitor.sections?.[0]?.section;

    if (!section) {
      throw new BadRequestException('El monitor no pertenece a ninguna sección');
    }

    return this.prisma.monitor.update({
      where: { id },
      data: {
        expectedStatusCode: section.expectedStatusCode,
        frequencySeconds: section.frequencySeconds,
        timeoutSeconds: section.timeoutSeconds,
        locations: section.locations,
        isActive: section.isActive,
        usesSectionSchedule: true,
        nextCheckAt: section.isActive ? new Date() : undefined,
      },
      include: { sections: { include: { section: { include: { members: true } } }, orderBy: { assignedAt: 'asc' } } },
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

    if (query.location && query.location !== 'ALL') {
      where.locations =
        query.location === 'default'
          ? { isEmpty: true }
          : { has: query.location };
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

  private async executeMonitorChecks(
    monitor: MonitorEntity,
  ): Promise<MonitorCheckOutcome[]> {
    const locations = this.normalizeLocations(monitor.locations);

    return Promise.all(
      locations.map((location) => this.executeSingleCheck(monitor, location)),
    );
  }

  private async executeSingleCheck(
    monitor: MonitorEntity,
    location: string,
  ): Promise<MonitorCheckOutcome> {
    if (monitor.type === 'TCP') return this.executeTcpCheck(monitor, location);
    if (monitor.type === 'DNS') return this.executeDnsCheck(monitor, location);
    if (monitor.type === 'SSL') return this.executeSslCheck(monitor, location);
    return this.executeHttpCheck(monitor, location);
  }

  private async executeHttpCheck(
    monitor: MonitorEntity,
    location: string,
  ): Promise<MonitorCheckOutcome> {
    const checkedAt = new Date();
    const startTime = performance.now();

    try {
      const parsedUrl = await this.parsePublicHttpUrl(monitor.target);

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        monitor.timeoutSeconds * 1000,
      );

      try {
        const { response, redirectChain } = await this.fetchHttpResponse(
          parsedUrl,
          controller.signal,
          monitor,
          location,
        );

        const body = monitor.keyword ? await response.text() : '';
        const statusCodeMatches = this.doesHttpStatusMatch(
          response.status,
          monitor.expectedStatusCode,
          this.isCloudflareProtectedResponse(response),
        );
        const keywordMatches =
          !monitor.keyword ||
          body.toLowerCase().includes(monitor.keyword.toLowerCase());

        if (redirectChain.length > 0) {
          this.logger.log(
            `HTTP monitor ${monitor.id} redirect chain (${location}): ${redirectChain.join(' | ')}`,
          );
        }

        return {
          checkedAt,
          errorMessage: statusCodeMatches
            ? keywordMatches
              ? null
              : `No se encontró la keyword "${monitor.keyword}"`
            : this.buildHttpStatusErrorMessage(
                response.status,
                monitor.expectedStatusCode,
              ),
          location,
          responseTimeMs: Math.round(performance.now() - startTime),
          status:
            statusCodeMatches && keywordMatches
              ? MonitorStatus.UP
              : MonitorStatus.DOWN,
          statusCode: response.status,
        };
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      const errorMessage = this.getMonitorCheckErrorMessage(
        error,
        monitor.timeoutSeconds,
      );

      if (this.isTimeoutError(error)) {
        this.logger.warn(
          `HTTP monitor ${monitor.id} timeout (${location}): ${errorMessage}`,
        );
      }

      return {
        checkedAt,
        errorMessage,
        location,
        responseTimeMs: Math.round(performance.now() - startTime),
        status: MonitorStatus.DOWN,
        statusCode: null,
      };
    }
  }

  private async executeTcpCheck(
    monitor: MonitorEntity,
    location: string,
  ): Promise<MonitorCheckOutcome> {
    const checkedAt = new Date();
    const startTime = performance.now();
    const port = monitor.tcpPort ?? 443;

    try {
      const hostname = await this.assertPublicHostTarget(monitor.target);
      await new Promise<void>((resolve, reject) => {
        const socket = new Socket();
        const timeout = setTimeout(() => {
          socket.destroy();
          reject(new Error(`Timeout tras ${monitor.timeoutSeconds} segundos`));
        }, monitor.timeoutSeconds * 1000);

        socket.once('connect', () => {
          clearTimeout(timeout);
          socket.end();
          resolve();
        });
        socket.once('error', (error) => {
          clearTimeout(timeout);
          socket.destroy();
          reject(error);
        });
        socket.connect(port, hostname);
      });

      return {
        checkedAt,
        errorMessage: null,
        location,
        responseTimeMs: Math.round(performance.now() - startTime),
        status: MonitorStatus.UP,
        statusCode: port,
      };
    } catch (error) {
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
    }
  }

  private async executeDnsCheck(
    monitor: MonitorEntity,
    location: string,
  ): Promise<MonitorCheckOutcome> {
    const checkedAt = new Date();
    const startTime = performance.now();
    const recordType = (monitor.dnsRecordType ?? 'A').toUpperCase();

    try {
      const hostname = await this.assertPublicHostTarget(monitor.target);
      const records = await this.resolveDnsRecords(hostname, recordType);
      const expected = monitor.dnsExpectedValue?.trim().toLowerCase();
      const normalizedRecords = records.map((record) => record.toLowerCase());
      const matchesExpected =
        !expected ||
        normalizedRecords.some((record) => record.includes(expected));

      return {
        checkedAt,
        errorMessage: matchesExpected
          ? null
          : `DNS ${recordType} no contiene ${monitor.dnsExpectedValue}`,
        location,
        responseTimeMs: Math.round(performance.now() - startTime),
        status: matchesExpected ? MonitorStatus.UP : MonitorStatus.DOWN,
        statusCode: records.length,
      };
    } catch (error) {
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
    }
  }

  private async executeSslCheck(
    monitor: MonitorEntity,
    location: string,
  ): Promise<MonitorCheckOutcome> {
    const checkedAt = new Date();
    const startTime = performance.now();
    const warningDays = monitor.sslWarningDays ?? 14;

    try {
      const hostname = await this.assertPublicUrlOrHostTarget(monitor.target);

      const certificate = await new Promise<PeerCertificate>(
        (resolve, reject) => {
          const socket = tlsConnect({
            host: hostname,
            port: 443,
            servername: hostname,
            rejectUnauthorized: false,
            timeout: monitor.timeoutSeconds * 1000,
          });

          socket.once('secureConnect', () => {
            const certificate = socket.getPeerCertificate();
            socket.end();
            resolve(certificate);
          });

          socket.once('timeout', () => {
            socket.destroy();
            reject(
              new Error(`Timeout tras ${monitor.timeoutSeconds} segundos`),
            );
          });

          socket.once('error', reject);
        },
      );

      if (!certificate?.valid_to) {
        throw new Error('No se pudo leer el certificado SSL');
      }

      const expiresAt = new Date(certificate.valid_to);
      const daysLeft = Math.ceil(
        (expiresAt.getTime() - Date.now()) / 86_400_000,
      );
      const isUp = daysLeft > warningDays;

      return {
        checkedAt,
        errorMessage: isUp
          ? null
          : `Certificado SSL caduca en ${daysLeft} días`,
        location,
        responseTimeMs: Math.round(performance.now() - startTime),
        status: isUp ? MonitorStatus.UP : MonitorStatus.DOWN,
        statusCode: daysLeft,
      };
    } catch (error) {
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
    }
  }

  private async resolveDnsRecords(
    hostname: string,
    recordType: string,
  ): Promise<string[]> {
    if (recordType === 'AAAA') return resolve6(hostname);
    if (recordType === 'CNAME') return resolveCname(hostname);
    if (recordType === 'MX') {
      const records = await resolveMx(hostname);
      return records.map((record) => `${record.priority} ${record.exchange}`);
    }
    if (recordType === 'TXT') {
      const records = await resolveTxt(hostname);
      return records.map((record) => record.join(''));
    }
    return resolve4(hostname);
  }

  private async assertAllowedTarget(
    type: string,
    target: string,
    tcpPort?: number | null,
  ) {
    if (type === 'TCP') {
      if (!tcpPort)
        throw new BadRequestException('Los monitores TCP necesitan puerto');
      await this.assertPublicHostTarget(target);
      return;
    }

    if (type === 'DNS') {
      await this.assertPublicHostTarget(target);
      return;
    }

    if (type === 'SSL') {
      await this.assertPublicUrlOrHostTarget(target);
      return;
    }

    await this.assertPublicHttpTarget(target);
  }

  private async assertPublicUrlOrHostTarget(target: string) {
    try {
      return (await this.parsePublicHttpUrl(target)).hostname;
    } catch {
      return this.assertPublicHostTarget(target);
    }
  }

  private async parsePublicHttpUrl(target: string) {
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(target);
    } catch {
      throw new BadRequestException('URL del monitor no válida');
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new BadRequestException('Solo se permiten URLs HTTP o HTTPS');
    }

    await this.assertPublicHostTarget(parsedUrl.hostname);
    return parsedUrl;
  }

  private async assertPublicHostTarget(target: string) {
    const hostname = target
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .split(':')[0]
      .trim()
      .toLowerCase();

    if (!hostname || this.isBlockedHostname(hostname)) {
      throw new BadRequestException('El destino del monitor no está permitido');
    }

    const addresses = isIP(hostname)
      ? [{ address: hostname }]
      : await lookup(hostname, { all: true, verbatim: true });

    if (addresses.length === 0) {
      throw new BadRequestException(
        'No se pudo resolver el destino del monitor',
      );
    }

    if (addresses.some(({ address }) => this.isPrivateAddress(address))) {
      throw new BadRequestException('El destino del monitor no está permitido');
    }

    return hostname;
  }

  private async assertPublicHttpTarget(target: string) {
    await this.parsePublicHttpUrl(target);
  }

  private async fetchHttpResponse(
    initialUrl: URL,
    signal: AbortSignal,
    monitor: Pick<MonitorEntity, 'id'>,
    location: string,
  ) {
    const redirectChain: string[] = [];
    const maxRedirects = 5;
    let currentUrl = initialUrl;

    for (let attempt = 0; attempt <= maxRedirects; attempt += 1) {
      const response = await fetch(currentUrl.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal,
        headers: {
          'User-Agent': 'MonitoringTFG/1.0',
        },
      });

      this.logger.log(
        `HTTP monitor ${monitor.id} response (${location}): status=${response.status} url=${currentUrl.toString()}`,
      );

      if (!this.isRedirectStatus(response.status)) {
        return { response, redirectChain };
      }

      const locationHeader = response.headers.get('location');

      if (!locationHeader) {
        return { response, redirectChain };
      }

      const nextUrl = await this.parsePublicHttpUrl(
        new URL(locationHeader, currentUrl).toString(),
      );

      redirectChain.push(
        `${response.status} ${currentUrl.toString()} -> ${nextUrl.toString()}`,
      );

      if (attempt === maxRedirects) {
        this.logger.warn(
          `HTTP monitor ${monitor.id} redirect limit reached (${location}): ${redirectChain.join(' | ')}`,
        );
        return { response, redirectChain };
      }

      currentUrl = nextUrl;
    }

    throw new Error('Redirect no resuelto');
  }

  private isRedirectStatus(statusCode: number) {
    return [301, 302, 303, 307, 308].includes(statusCode);
  }

  private doesHttpStatusMatch(
    statusCode: number,
    expectedStatusCode: number,
    isCloudflareProtected: boolean,
  ) {
    if (isCloudflareProtected) {
      return true;
    }

    if (expectedStatusCode === 200) {
      return statusCode >= 200 && statusCode < 400;
    }

    return statusCode === expectedStatusCode;
  }

  private isCloudflareProtectedResponse(response: Response) {
    const server = response.headers.get('server')?.toLowerCase() ?? '';
    const cfMitigated =
      response.headers.get('cf-mitigated')?.toLowerCase() ?? '';
    const hasCloudflareHeaders =
      server.includes('cloudflare') || Boolean(response.headers.get('cf-ray'));

    if (!hasCloudflareHeaders) {
      return false;
    }

    return (
      cfMitigated === 'challenge' || [403, 429, 503].includes(response.status)
    );
  }

  private buildHttpStatusErrorMessage(
    statusCode: number,
    expectedStatusCode: number,
  ) {
    if (expectedStatusCode === 200) {
      return `Código HTTP ${statusCode}, esperado rango 2xx/3xx`;
    }

    return `Código HTTP ${statusCode}, esperado ${expectedStatusCode}`;
  }

  private isBlockedHostname(hostname: string) {
    return (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === '0.0.0.0' ||
      hostname === '::'
    );
  }

  private isPrivateAddress(address: string) {
    if (isIP(address) === 4) {
      const parts = address.split('.').map(Number);
      const [first, second] = parts;

      return (
        first === 10 ||
        first === 127 ||
        (first === 169 && second === 254) ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168) ||
        (first === 100 && second >= 64 && second <= 127) ||
        first === 0
      );
    }

    if (isIP(address) === 6) {
      const normalized = address.toLowerCase();

      return (
        normalized === '::1' ||
        normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        normalized.startsWith('fe80:')
      );
    }

    return true;
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
      | 'locations'
    >,
    outcomes: MonitorCheckOutcome[],
  ): Promise<MonitorCheckBatchResult> {
    const nextCheckAt = new Date(Date.now() + monitor.frequencySeconds * 1000);
    const overallStatus = this.getOverallMonitorStatus(outcomes);
    const latestCheckedAt = this.getLatestCheckedAt(outcomes);
    const averageResponseTime = this.getAverageResponseTime(outcomes);
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

      const incidentSync = await this.syncIncidentForCheck(
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
        checkedAt: latestCheckedAt,
        incidentSync,
        overallStatus,
        previousStatus,
        results,
      } satisfies PersistedCheckResult;
    });

    await this.publishCheckEvents(monitor.id, monitor.organizationId, persisted);

    return {
      overallStatus: persisted.overallStatus,
      results: persisted.results,
    };
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

  private getOverallMonitorStatus(
    outcomes: MonitorCheckOutcome[],
  ): MonitorStatusValue {
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
    results: Array<Pick<CheckResultEntity, 'status'>>,
  ): MonitorStatusValue {
    if (results.some((result) => result.status === MonitorStatus.DOWN)) {
      return MonitorStatus.DOWN;
    }

    if (results.every((result) => result.status === MonitorStatus.UP)) {
      return MonitorStatus.UP;
    }

    return MonitorStatus.UNKNOWN;
  }

  private getRecentCheckBatches(
    results: CheckResultEntity[],
    batchSize: number,
  ): CheckResultEntity[][] {
    const batches: CheckResultEntity[][] = [];

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
    results: CheckResultEntity[],
    batchSize: number,
  ): CheckResultEntity[][] {
    const batches = this.getRecentCheckBatches(results, batchSize);
    const consecutiveDownBatches: CheckResultEntity[][] = [];

    for (const batch of batches) {
      if (this.getBatchStatus(batch) !== MonitorStatus.DOWN) {
        break;
      }

      consecutiveDownBatches.push(batch);
    }

    return consecutiveDownBatches;
  }

  private getIncidentStartedAt(batches: CheckResultEntity[][], fallback: Date) {
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
    monitor: Pick<
      MonitorEntity,
      | 'id'
      | 'name'
      | 'target'
      | 'organizationId'
      | 'alertThreshold'
      | 'alertEmail'
      | 'locations'
    >,
    outcome: MonitorCheckOutcome,
    outcomes: MonitorCheckOutcome[],
  ): Promise<IncidentSyncResult> {
    const openIncident = await tx.incident.findFirst({
      where: {
        monitorId: monitor.id,
        status: { in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED] },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (outcome.status === MonitorStatus.DOWN) {
      if (openIncident) {
        return null;
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
        return null;
      }

      const incident = await tx.incident.create({
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

      if (monitor.alertEmail !== false) {
        await this.notificationsService.notifyMonitorDown(
          {
            monitorId: monitor.id,
            incidentId: incident.id,
            organizationId: monitor.organizationId,
            monitorName: monitor.name ?? `Monitor #${monitor.id}`,
            monitorTarget: monitor.target,
            title: incident.title,
            severity: incident.severity,
            errorMessage: outcome.errorMessage,
            startedAt: incident.startedAt,
          },
          tx,
        );
      }

      return {
        happenedAt: incident.startedAt ?? outcome.checkedAt,
        incidentId: incident.id,
        type: 'created',
      };
    }

    if (!openIncident) {
      return null;
    }

    const resolvedIncident = await tx.incident.update({
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
        lastStatusChangeAt: outcome.checkedAt,
      },
    });

    if (monitor.alertEmail !== false) {
      await this.notificationsService.notifyMonitorRecovered(
        {
          monitorId: monitor.id,
          incidentId: resolvedIncident.id,
          organizationId: monitor.organizationId,
          monitorName: monitor.name ?? `Monitor #${monitor.id}`,
          monitorTarget: monitor.target,
          title: resolvedIncident.title,
          severity: resolvedIncident.severity,
          resolvedAt: outcome.checkedAt,
        },
        tx,
      );
    }

    return {
      happenedAt: outcome.checkedAt,
      incidentId: resolvedIncident.id,
      type: 'resolved',
    };
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
    }) as Promise<MonitorEntity | null>;
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
      dto.timeoutSeconds !== undefined ||
      dto.locations !== undefined
    );
  }

  private matchesPrimarySectionSchedule(monitor: MonitorEntity) {
    const section = monitor.sections?.[0]?.section;
    if (!section) return false;
    return (
      monitor.expectedStatusCode === section.expectedStatusCode &&
      monitor.frequencySeconds === section.frequencySeconds &&
      monitor.timeoutSeconds === section.timeoutSeconds &&
      this.haveSameLocations(monitor.locations ?? [], section.locations)
    );
  }

  private haveSameLocations(left: string[], right: string[]) {
    const normalizedLeft = this.sanitizeConfiguredLocations(left).sort();
    const normalizedRight = this.sanitizeConfiguredLocations(right).sort();
    return (
      normalizedLeft.length === normalizedRight.length &&
      normalizedLeft.every((location, index) => location === normalizedRight[index])
    );
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

  private isTimeoutError(error: unknown) {
    return (
      (error instanceof DOMException && error.name === 'AbortError') ||
      (error instanceof Error &&
        /^Timeout tras \d+ segundos$/.test(error.message))
    );
  }
}
