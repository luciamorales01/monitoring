import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IncidentStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { IncidentsService } from './incidents.service';

describe('IncidentsService', () => {
  let service: IncidentsService;
  let prisma: {
    incident: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  const user = {
    organizationId: 10,
    userId: 20,
  };

  beforeEach(async () => {
    prisma = {
      incident: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<IncidentsService>(IncidentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('lists incidents for the current organization', async () => {
    prisma.incident.findMany.mockResolvedValue([{ id: 1 }]);

    const result = await service.findAll(user);

    expect(prisma.incident.findMany).toHaveBeenCalledWith({
      where: {
        monitor: {
          organizationId: user.organizationId,
        },
      },
      include: {
        monitor: true,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });
    expect(result).toEqual([{ id: 1 }]);
  });

  it('lists only active incidents for the current organization', async () => {
    prisma.incident.findMany.mockResolvedValue([{ id: 2, status: IncidentStatus.OPEN }]);

    const result = await service.findActive(user);

    expect(prisma.incident.findMany).toHaveBeenCalledWith({
      where: {
        status: IncidentStatus.OPEN,
        monitor: {
          organizationId: user.organizationId,
        },
      },
      include: {
        monitor: true,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });
    expect(result).toEqual([{ id: 2, status: IncidentStatus.OPEN }]);
  });

  it('returns one incident when it belongs to the current organization', async () => {
    prisma.incident.findUnique.mockResolvedValue({
      id: 3,
      monitor: {
        organizationId: user.organizationId,
      },
    });

    const result = await service.findOne(3, user);

    expect(prisma.incident.findUnique).toHaveBeenCalledWith({
      where: { id: 3 },
      include: {
        monitor: true,
      },
    });
    expect(result).toEqual({
      id: 3,
      monitor: {
        organizationId: user.organizationId,
      },
    });
  });

  it('rejects incident access from another organization', async () => {
    prisma.incident.findUnique.mockResolvedValue({
      id: 4,
      monitor: {
        organizationId: 999,
      },
    });

    await expect(service.findOne(4, user)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws when incident does not exist', async () => {
    prisma.incident.findUnique.mockResolvedValue(null);

    await expect(service.findOne(999, user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
