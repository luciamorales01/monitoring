import { MonitorsService } from './monitors.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { IncidentStatus, MonitorStatus } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

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
    };

    service = new MonitorsService(prisma as unknown as PrismaService);
    jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('stores configured locations and alert settings on monitor creation', async () => {
    prisma.monitor.create.mockResolvedValue({
      id: 50,
      name: 'API principal',
      locations: ['madrid', 'paris'],
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
        locations: [' madrid ', 'paris', 'madrid'],
        alertEmail: false,
        alertPush: true,
        alertThreshold: 5,
      },
      user,
    );

    expect(prisma.monitor.create).toHaveBeenCalledWith({
      data: {
        name: 'API principal',
        type: 'HTTPS',
        target: 'https://example.com/health',
        expectedStatusCode: 200,
        frequencySeconds: 60,
        timeoutSeconds: 10,
        locations: ['madrid', 'paris'],
        alertEmail: false,
        alertPush: true,
        alertThreshold: 5,
        organizationId: user.organizationId,
        createdById: user.userId,
      },
    });
  });

  it('updates a monitor keeping boolean values and sanitizing locations', async () => {
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
      locations: ['madrid', 'frankfurt'],
    });

    await service.update(
      7,
      {
        name: 'API editada',
        alertEmail: false,
        alertPush: true,
        locations: [' madrid ', 'frankfurt', 'madrid'],
      },
      user,
    );

    expect(prisma.monitor.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        name: 'API editada',
        alertEmail: false,
        alertPush: true,
        locations: ['madrid', 'frankfurt'],
      },
    });
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
      signal: expect.any(AbortSignal),
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
        status: IncidentStatus.OPEN,
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

  it('creates one check result per location and marks the monitor DOWN when any location fails', async () => {
    prisma.monitor.findUnique.mockResolvedValue({
      id: 12,
      name: 'API regional',
      target: 'https://example.com/regional',
      timeoutSeconds: 5,
      expectedStatusCode: 200,
      frequencySeconds: 60,
      alertThreshold: 1,
      locations: ['madrid', 'paris'],
      organizationId: user.organizationId,
    });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ status: 200 })
      .mockResolvedValueOnce({ status: 503 });
    prisma.checkResult.create
      .mockResolvedValueOnce({
        id: 201,
        status: MonitorStatus.UP,
        location: 'madrid',
      })
      .mockResolvedValueOnce({
        id: 202,
        status: MonitorStatus.DOWN,
        location: 'paris',
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
        location: 'paris',
      },
      {
        id: 201,
        monitorId: 12,
        status: MonitorStatus.UP,
        checkedAt: new Date('2026-04-26T09:00:00.000Z'),
        location: 'madrid',
      },
    ]);
    prisma.incident.create.mockResolvedValue({
      id: 900,
      monitorId: 12,
      status: IncidentStatus.OPEN,
    });

    const result = await service.runCheck(12, user);

    expect(prisma.checkResult.create).toHaveBeenCalledTimes(2);
    expect(prisma.checkResult.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        monitorId: 12,
        location: 'madrid',
        status: MonitorStatus.UP,
        statusCode: 200,
      }),
    });
    expect(prisma.checkResult.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        monitorId: 12,
        location: 'paris',
        status: MonitorStatus.DOWN,
        statusCode: 503,
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
        title: 'Monitor caído en Paris',
      }),
    });
    expect(result).toEqual({
      overallStatus: MonitorStatus.DOWN,
      results: [
        { id: 201, status: MonitorStatus.UP, location: 'madrid' },
        { id: 202, status: MonitorStatus.DOWN, location: 'paris' },
      ],
    });
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
    });
    prisma.checkResult.create.mockResolvedValue({
      id: 102,
      status: MonitorStatus.UP,
    });
    prisma.monitor.update.mockResolvedValue({
      id: 4,
      currentStatus: MonitorStatus.UP,
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
