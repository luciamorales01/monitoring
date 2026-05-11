import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { MonitorsService } from './monitors.service';

const MonitorStatus = {
  UP: 'UP',
  DOWN: 'DOWN',
  PAUSED: 'PAUSED',
} as const;

const IncidentStatus = {
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED',
} as const;

describe('MonitorsService', () => {
  let service: MonitorsService;

  let prisma: {
    $transaction: jest.Mock;
    checkResult: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
    incident: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    monitor: {
      create: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    organization: {
      findUnique: jest.Mock;
    };
  };

  let notificationsService: {
    notifyMonitorDown: jest.Mock;
    notifyMonitorRecovered: jest.Mock;
  };
  let eventsService: {
    publish: jest.Mock;
  };

  const user = {
    organizationId: 10,
    userId: 20,
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return arg(prisma);
        }

        return Promise.all(arg as Array<Promise<unknown>>);
      }),
      checkResult: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      incident: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      monitor: {
        create: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      organization: {
        findUnique: jest.fn().mockResolvedValue({
          plan: 'FREE',
          _count: { monitors: 0 },
        }),
      },
    };

    notificationsService = {
      notifyMonitorDown: jest.fn(),
      notifyMonitorRecovered: jest.fn(),
    };
    eventsService = {
      publish: jest.fn(),
    };

    service = new MonitorsService(
      prisma as unknown as PrismaService,
      notificationsService as unknown as ConstructorParameters<typeof MonitorsService>[1],
      eventsService as unknown as EventsService,
    );
    jest.spyOn(global, 'fetch');
    jest
      .spyOn(
        service as MonitorsService & {
          assertPublicHostTarget: (target: string) => Promise<string>;
        },
        'assertPublicHostTarget',
      )
      .mockImplementation(async (target: string) => target);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('stores alert settings on monitor creation', async () => {
    prisma.monitor.create.mockResolvedValue({
      id: 50,
      name: 'API principal',
      alertEmail: false,
      alertPush: true,
      alertThreshold: 5,
    });

    await service.create(
      {
        name: 'API principal',
        type: 'HTTPS' as const,
        target: 'https://example.com/health',
        expectedStatusCode: 200,
        frequencySeconds: 60,
        timeoutSeconds: 10,
        alertEmail: false,
        alertPush: true,
        alertThreshold: 5,
      },
      user,
    );

    expect(prisma.monitor.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'API principal',
        type: 'HTTPS',
        target: 'https://example.com/health',
        expectedStatusCode: 200,
        frequencySeconds: 60,
        timeoutSeconds: 10,
        alertEmail: false,
        alertPush: true,
        alertThreshold: 5,
        organizationId: user.organizationId,
        createdById: user.userId,
      }),
    });
  });

  it('blocks monitor creation when organization reaches plan limit', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      plan: 'FREE',
      _count: { monitors: 5 },
    });

    await expect(
      service.create(
        {
          name: 'API principal',
          type: 'HTTPS' as const,
          target: 'https://example.com/health',
          expectedStatusCode: 200,
          frequencySeconds: 60,
          timeoutSeconds: 10,
          alertEmail: true,
          alertPush: false,
          alertThreshold: 3,
        },
        user,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.monitor.create).not.toHaveBeenCalled();
  });

  it('updates a monitor keeping boolean values', async () => {
    prisma.monitor.findUnique.mockResolvedValue({
      id: 7,
      organizationId: user.organizationId,
      isActive: true,
    });

    prisma.monitor.update.mockResolvedValue({
      id: 7,
      name: 'API editada',
      alertEmail: false,
      alertPush: true,
    });

    await service.update(
      7,
      {
        name: 'API editada',
        alertEmail: false,
        alertPush: true,
      },
      user,
    );

    expect(prisma.monitor.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: {
          name: 'API editada',
          alertEmail: false,
          alertPush: true,
        },
      }),
    );
  });

  it('deletes a monitor inside the same organization', async () => {
    prisma.monitor.findUnique.mockResolvedValue({
      id: 11,
      organizationId: user.organizationId,
    });

    prisma.monitor.delete.mockResolvedValue({
      id: 11,
      name: 'API eliminada',
    });

    const result = await service.remove(11, user);

    expect(prisma.monitor.delete).toHaveBeenCalledWith({
      where: { id: 11 },
    });

    expect(result).toEqual({
      id: 11,
      name: 'API eliminada',
    });
  });

  it('marks monitor as UP when response status matches expected status', async () => {
    prisma.monitor.findUnique.mockResolvedValue({
      id: 1,
      target: 'https://example.com/health',
      timeoutSeconds: 5,
      expectedStatusCode: 200,
      frequencySeconds: 60,
      locations: [],
      organizationId: user.organizationId,
      checkResults: [],
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      headers: new Headers(),
    });

    prisma.checkResult.create.mockResolvedValue({
      id: 99,
      status: MonitorStatus.UP,
    });

    prisma.monitor.update.mockResolvedValue({
      id: 1,
      currentStatus: MonitorStatus.UP,
    });

    prisma.incident.findFirst.mockResolvedValue(null);

    const result = await service.runCheck(1, user);

    expect(global.fetch).toHaveBeenCalledWith('https://example.com/health', {
      method: 'GET',
      redirect: 'manual',
      signal: expect.any(AbortSignal),
      headers: {
        'User-Agent': 'MonitoringTFG/1.0',
      },
    });

    expect(prisma.checkResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        monitorId: 1,
        status: MonitorStatus.UP,
        statusCode: 200,
        errorMessage: null,
        location: 'default',
        responseTimeMs: expect.any(Number),
        checkedAt: expect.any(Date),
      }),
    });

    expect(prisma.monitor.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        currentStatus: MonitorStatus.UP,
        lastResponseTime: expect.any(Number),
        lastCheckedAt: expect.any(Date),
        nextCheckAt: expect.any(Date),
      }),
    });

    expect(prisma.incident.findFirst).toHaveBeenCalledWith({
      where: {
        monitorId: 1,
        status: {
          in: [IncidentStatus.OPEN, 'ACKNOWLEDGED'],
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    expect(prisma.incident.create).not.toHaveBeenCalled();
    expect(prisma.incident.update).not.toHaveBeenCalled();

    expect(result).toEqual({
      overallStatus: MonitorStatus.UP,
      results: [
        {
          id: 99,
          status: MonitorStatus.UP,
        },
      ],
    });
  });

  it('marks monitor as DOWN when request fails', async () => {
    const failedAt = new Date('2026-04-26T08:00:00.000Z');

    prisma.monitor.findUnique.mockResolvedValue({
      id: 2,
      name: 'API caida',
      target: 'https://example.com/fail',
      timeoutSeconds: 3,
      expectedStatusCode: 200,
      frequencySeconds: 60,
      alertThreshold: 1,
      locations: [],
      organizationId: user.organizationId,
      checkResults: [],
    });

    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    prisma.checkResult.create.mockResolvedValue({
      id: 100,
      status: MonitorStatus.DOWN,
    });

    prisma.monitor.update.mockResolvedValue({
      id: 2,
      currentStatus: MonitorStatus.DOWN,
    });

    prisma.incident.findFirst.mockResolvedValue(null);

    prisma.checkResult.findMany.mockResolvedValue([
      {
        id: 1000,
        monitorId: 2,
        status: MonitorStatus.DOWN,
        checkedAt: failedAt,
        location: 'default',
      },
    ]);

    prisma.incident.create.mockResolvedValue({
      id: 200,
      monitorId: 2,
      status: IncidentStatus.OPEN,
    });

    const result = await service.runCheck(2, user);

    expect(prisma.checkResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        monitorId: 2,
        status: MonitorStatus.DOWN,
        statusCode: null,
        errorMessage: 'Network error',
        location: 'default',
        responseTimeMs: expect.any(Number),
        checkedAt: expect.any(Date),
      }),
    });

    expect(prisma.monitor.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: expect.objectContaining({
        currentStatus: MonitorStatus.DOWN,
        lastResponseTime: expect.any(Number),
        lastCheckedAt: expect.any(Date),
        nextCheckAt: expect.any(Date),
      }),
    });

    expect(prisma.incident.create).toHaveBeenCalledWith({
      data: {
        monitorId: 2,
        status: IncidentStatus.OPEN,
        title: 'Monitor caído',
        startedAt: expect.any(Date),
      },
    });

    expect(result).toEqual({
      overallStatus: MonitorStatus.DOWN,
      results: [
        {
          id: 100,
          status: MonitorStatus.DOWN,
        },
      ],
    });
  });

  it('creates one check result and marks the monitor DOWN when it fails', async () => {
    prisma.monitor.findUnique.mockResolvedValue({
      id: 12,
      name: 'API regional',
      target: 'https://example.com/regional',
      timeoutSeconds: 5,
      expectedStatusCode: 200,
      frequencySeconds: 60,
      alertThreshold: 1,
      organizationId: user.organizationId,
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 503,
      headers: new Headers(),
    });

    prisma.checkResult.create.mockResolvedValueOnce({
      id: 202,
      status: MonitorStatus.DOWN,
      location: 'default',
    });

    prisma.monitor.update.mockResolvedValue({
      id: 12,
      currentStatus: MonitorStatus.DOWN,
    });

    prisma.incident.findFirst.mockResolvedValue(null);

    prisma.checkResult.findMany.mockResolvedValue([
      {
        id: 202,
        monitorId: 12,
        status: MonitorStatus.DOWN,
        checkedAt: new Date('2026-04-26T09:00:01.000Z'),
        location: 'default',
      },
    ]);

    prisma.incident.create.mockResolvedValue({
      id: 900,
      monitorId: 12,
      status: IncidentStatus.OPEN,
    });

    const result = await service.runCheck(12, user);

    expect(prisma.checkResult.create).toHaveBeenCalledTimes(1);

    expect(prisma.checkResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        monitorId: 12,
        location: 'default',
        status: MonitorStatus.DOWN,
        statusCode: expect.any(Number),
      }),
    });

    expect(prisma.monitor.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: expect.objectContaining({
        currentStatus: MonitorStatus.DOWN,
        lastResponseTime: expect.any(Number),
        lastCheckedAt: expect.any(Date),
        nextCheckAt: expect.any(Date),
      }),
    });

    expect(prisma.incident.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        monitorId: 12,
        status: IncidentStatus.OPEN,
        title: expect.stringContaining('Monitor caído'),
      }),
    });

    expect(result).toEqual({
      overallStatus: MonitorStatus.DOWN,
      results: [
        { id: 202, status: MonitorStatus.DOWN, location: 'default' },
      ],
    });
  });

  it('marks monitor as UP when the target redirects to a healthy page', async () => {
    prisma.monitor.findUnique.mockResolvedValue({
      id: 13,
      target: 'https://example.com',
      timeoutSeconds: 5,
      expectedStatusCode: 200,
      frequencySeconds: 60,
      locations: [],
      organizationId: user.organizationId,
      checkResults: [],
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        status: 301,
        headers: new Headers({
          location: 'https://www.example.com/home',
        }),
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
      });

    prisma.checkResult.create.mockResolvedValue({
      id: 203,
      status: MonitorStatus.UP,
    });

    prisma.monitor.update.mockResolvedValue({
      id: 13,
      currentStatus: MonitorStatus.UP,
    });

    prisma.incident.findFirst.mockResolvedValue(null);

    await service.runCheck(13, user);

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'https://example.com/',
      expect.objectContaining({
        method: 'GET',
        redirect: 'manual',
        signal: expect.any(AbortSignal),
      }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://www.example.com/home',
      expect.objectContaining({
        method: 'GET',
        redirect: 'manual',
        signal: expect.any(AbortSignal),
      }),
    );
    expect(prisma.checkResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        monitorId: 13,
        status: MonitorStatus.UP,
        statusCode: 200,
        errorMessage: null,
      }),
    });
  });

  it('marks monitor as DOWN when the response status does not match the expected code', async () => {
    prisma.monitor.findUnique.mockResolvedValue({
      id: 14,
      target: 'https://example.com',
      timeoutSeconds: 5,
      expectedStatusCode: 200,
      frequencySeconds: 60,
      alertThreshold: 3,
      organizationId: user.organizationId,
      checkResults: [],
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      status: 403,
      headers: new Headers(),
    });

    prisma.checkResult.create.mockResolvedValue({
      id: 204,
      status: MonitorStatus.DOWN,
    });

    prisma.monitor.update.mockResolvedValue({
      id: 14,
      currentStatus: MonitorStatus.DOWN,
    });

    prisma.incident.findFirst.mockResolvedValue(null);
    prisma.checkResult.findMany.mockResolvedValue([
      {
        id: 204,
        monitorId: 14,
        status: MonitorStatus.DOWN,
        checkedAt: new Date('2026-04-26T10:00:00.000Z'),
        location: 'default',
      },
    ]);

    await service.runCheck(14, user);

    expect(prisma.checkResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        monitorId: 14,
        status: MonitorStatus.DOWN,
        statusCode: 403,
        errorMessage: 'Código HTTP 403, esperado 200',
      }),
    });

    expect(prisma.incident.create).not.toHaveBeenCalled();
  });

  it('finds only active monitors due by nextCheckAt', async () => {
    prisma.monitor.findMany.mockResolvedValue([{ id: 3 }, { id: 7 }]);

    const result = await service.findDueActiveMonitorIds();

    expect(prisma.monitor.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
        nextCheckAt: {
          lte: expect.any(Date),
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        nextCheckAt: 'asc',
      },
    });

    expect(result).toEqual([3, 7]);
  });

  it('returns the latest 50 checks for a monitor in the same organization', async () => {
    const checks = [
      { id: 11, monitorId: 1, status: MonitorStatus.UP },
      { id: 10, monitorId: 1, status: MonitorStatus.DOWN },
    ];

    prisma.monitor.findUnique.mockResolvedValue({
      id: 1,
      organizationId: user.organizationId,
    });

    prisma.checkResult.findMany.mockResolvedValue(checks);

    const result = await service.findRecentChecks(1, user);

    expect(prisma.checkResult.findMany).toHaveBeenCalledWith({
      where: {
        monitorId: 1,
      },
      orderBy: {
        checkedAt: 'desc',
      },
      take: 50,
    });

    expect(result).toEqual(checks);
  });

  it('toggles the active state for a monitor in the same organization', async () => {
    prisma.monitor.findUnique.mockResolvedValue({
      id: 8,
      isActive: true,
      organizationId: user.organizationId,
    });

    prisma.monitor.update.mockResolvedValue({
      id: 8,
      isActive: false,
    });

    const result = await service.toggleActive(8, user);

    expect(prisma.monitor.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: {
        isActive: false,
      },
    });

    expect(result).toEqual({
      id: 8,
      isActive: false,
    });
  });

  it('sets nextCheckAt immediately when a paused monitor is resumed', async () => {
    prisma.monitor.findUnique.mockResolvedValue({
      id: 9,
      isActive: false,
      organizationId: user.organizationId,
    });

    prisma.monitor.update.mockResolvedValue({
      id: 9,
      isActive: true,
    });

    await service.toggleActive(9, user);

    expect(prisma.monitor.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: {
        isActive: true,
        nextCheckAt: expect.any(Date),
      },
    });
  });

  it('supports ascending order for recent checks', async () => {
    prisma.monitor.findUnique.mockResolvedValue({
      id: 1,
      organizationId: user.organizationId,
    });

    prisma.checkResult.findMany.mockResolvedValue([]);

    await service.findRecentChecks(1, user, 'asc');

    expect(prisma.checkResult.findMany).toHaveBeenCalledWith({
      where: {
        monitorId: 1,
      },
      orderBy: {
        checkedAt: 'asc',
      },
      take: 50,
    });
  });

  it('does not create a duplicate incident when the monitor is already down with an open incident', async () => {
    prisma.monitor.findUnique.mockResolvedValue({
      id: 3,
      name: 'API secundaria',
      target: 'https://example.com/down',
      timeoutSeconds: 5,
      expectedStatusCode: 200,
      frequencySeconds: 60,
      alertThreshold: 1,
      locations: [],
      organizationId: user.organizationId,
    });

    (global.fetch as jest.Mock).mockRejectedValue(new Error('Timeout'));

    prisma.checkResult.create.mockResolvedValue({
      id: 101,
      status: MonitorStatus.DOWN,
    });

    prisma.monitor.update.mockResolvedValue({
      id: 3,
      currentStatus: MonitorStatus.DOWN,
    });

    prisma.incident.findFirst.mockResolvedValue({
      id: 300,
      monitorId: 3,
      status: IncidentStatus.OPEN,
      startedAt: new Date('2026-04-25T10:00:00.000Z'),
    });

    await service.runCheck(3, user);

    expect(prisma.incident.create).not.toHaveBeenCalled();
  });

  it('does not create an incident with one DOWN check when threshold is 3', async () => {
    prisma.monitor.findUnique.mockResolvedValue({
      id: 30,
      name: 'API con umbral',
      target: 'https://example.com/threshold',
      timeoutSeconds: 5,
      expectedStatusCode: 200,
      frequencySeconds: 60,
      alertThreshold: 3,
      locations: [],
      organizationId: user.organizationId,
    });

    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    prisma.checkResult.create.mockResolvedValue({
      id: 301,
      status: MonitorStatus.DOWN,
    });

    prisma.monitor.update.mockResolvedValue({
      id: 30,
      currentStatus: MonitorStatus.DOWN,
    });

    prisma.incident.findFirst.mockResolvedValue(null);

    prisma.checkResult.findMany.mockResolvedValue([
      {
        id: 301,
        monitorId: 30,
        status: MonitorStatus.DOWN,
        checkedAt: new Date('2026-04-26T10:00:00.000Z'),
        location: 'default',
      },
    ]);

    await service.runCheck(30, user);

    expect(prisma.checkResult.findMany).toHaveBeenCalledWith({
      where: {
        monitorId: 30,
      },
      orderBy: {
        checkedAt: 'desc',
      },
      take: 3,
    });

    expect(prisma.incident.create).not.toHaveBeenCalled();
  });

  it('creates an incident when threshold reaches 3 consecutive DOWN checks', async () => {
    prisma.monitor.findUnique.mockResolvedValue({
      id: 31,
      name: 'API con umbral',
      target: 'https://example.com/threshold',
      timeoutSeconds: 5,
      expectedStatusCode: 200,
      frequencySeconds: 60,
      alertThreshold: 3,
      locations: [],
      organizationId: user.organizationId,
    });

    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    prisma.checkResult.create.mockResolvedValue({
      id: 302,
      status: MonitorStatus.DOWN,
    });

    prisma.monitor.update.mockResolvedValue({
      id: 31,
      currentStatus: MonitorStatus.DOWN,
    });

    prisma.incident.findFirst.mockResolvedValue(null);

    prisma.checkResult.findMany.mockResolvedValue([
      {
        id: 302,
        monitorId: 31,
        status: MonitorStatus.DOWN,
        checkedAt: new Date('2026-04-26T10:02:00.000Z'),
        location: 'default',
      },
      {
        id: 303,
        monitorId: 31,
        status: MonitorStatus.DOWN,
        checkedAt: new Date('2026-04-26T10:01:00.000Z'),
        location: 'default',
      },
      {
        id: 304,
        monitorId: 31,
        status: MonitorStatus.DOWN,
        checkedAt: new Date('2026-04-26T10:00:00.000Z'),
        location: 'default',
      },
    ]);

    prisma.incident.create.mockResolvedValue({
      id: 901,
      monitorId: 31,
      status: IncidentStatus.OPEN,
    });

    await service.runCheck(31, user);

    expect(prisma.incident.create).toHaveBeenCalledWith({
      data: {
        monitorId: 31,
        status: IncidentStatus.OPEN,
        title: 'Monitor caído',
        startedAt: new Date('2026-04-26T10:00:00.000Z'),
      },
    });
  });

  it('resolves an open incident when the monitor comes back up', async () => {
    const startedAt = new Date('2026-04-25T10:00:00.000Z');

    prisma.monitor.findUnique.mockResolvedValue({
      id: 4,
      name: 'API principal',
      target: 'https://example.com/up',
      timeoutSeconds: 5,
      expectedStatusCode: 200,
      frequencySeconds: 60,
      locations: [],
      organizationId: user.organizationId,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      headers: new Headers(),
    });

    prisma.checkResult.create.mockResolvedValue({
      id: 102,
      status: MonitorStatus.UP,
    });

    prisma.monitor.update.mockResolvedValue({
      id: 4,
      currentStatus: MonitorStatus.UP,
    });
    prisma.incident.update.mockResolvedValue({
      id: 400,
      title: 'Monitor caído',
      severity: 'critical',
    });

    prisma.incident.findFirst.mockResolvedValue({
      id: 400,
      monitorId: 4,
      status: IncidentStatus.OPEN,
      startedAt,
    });

    await service.runCheck(4, user);

    expect(prisma.incident.update).toHaveBeenCalledWith({
      where: {
        id: 400,
      },
      data: {
        status: IncidentStatus.RESOLVED,
        resolvedAt: expect.any(Date),
        durationSeconds: expect.any(Number),
        lastStatusChangeAt: expect.any(Date),
      },
    });
  });

  it('rejects check history access when monitor belongs to another organization', async () => {
    prisma.monitor.findUnique.mockResolvedValue({
      id: 1,
      organizationId: 999,
    });

    await expect(service.findRecentChecks(1, user)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(prisma.checkResult.findMany).not.toHaveBeenCalled();
  });

  it('rejects toggle access when monitor belongs to another organization', async () => {
    prisma.monitor.findUnique.mockResolvedValue({
      id: 1,
      isActive: true,
      organizationId: 999,
    });

    await expect(service.toggleActive(1, user)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(prisma.monitor.update).not.toHaveBeenCalled();
  });
});
