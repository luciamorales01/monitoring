import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const user = {
    organizationId: 10,
    userId: 20,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('lists organization users without password hashes', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 1,
        name: 'Ana',
        email: 'ana@example.com',
        role: 'OWNER',
        passwordHash: 'secret',
        organizationId: 10,
        createdAt: new Date('2026-04-20T10:00:00.000Z'),
        updatedAt: new Date('2026-04-24T11:00:00.000Z'),
        organization: {
          id: 10,
          name: 'Acme',
          slug: 'acme',
        },
      },
    ]);

    const result = await service.findAll(user);

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: user.organizationId,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
    expect(result).toEqual([
      {
        id: 1,
        name: 'Ana',
        email: 'ana@example.com',
        role: 'OWNER',
        organizationId: 10,
        createdAt: new Date('2026-04-20T10:00:00.000Z'),
        updatedAt: new Date('2026-04-24T11:00:00.000Z'),
        organization: {
          id: 10,
          name: 'Acme',
          slug: 'acme',
        },
        status: 'ACTIVE',
      },
    ]);
  });

  it('updates organization users without password hashes', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      name: 'Ana',
      email: 'ana@example.com',
      role: 'OWNER',
      passwordHash: 'secret',
      organizationId: 10,
      createdAt: new Date('2026-04-20T10:00:00.000Z'),
      updatedAt: new Date('2026-04-24T11:00:00.000Z'),
      organization: {
        id: 10,
        name: 'Acme',
        slug: 'acme',
      },
    });
    prisma.user.update.mockResolvedValue({
      id: 1,
      name: 'Ana Actualizada',
      email: 'ana.updated@example.com',
      role: 'ADMIN',
      passwordHash: 'secret',
      organizationId: 10,
      createdAt: new Date('2026-04-20T10:00:00.000Z'),
      updatedAt: new Date('2026-04-25T11:00:00.000Z'),
      organization: {
        id: 10,
        name: 'Acme',
        slug: 'acme',
      },
    });

    const result = await service.update(
      1,
      {
        name: 'Ana Actualizada',
        email: 'ana.updated@example.com',
        role: 'ADMIN',
      },
      user,
    );

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        name: 'Ana Actualizada',
        email: 'ana.updated@example.com',
        role: 'ADMIN',
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
    expect(result).toEqual({
      id: 1,
      name: 'Ana Actualizada',
      email: 'ana.updated@example.com',
      role: 'ADMIN',
      organizationId: 10,
      createdAt: new Date('2026-04-20T10:00:00.000Z'),
      updatedAt: new Date('2026-04-25T11:00:00.000Z'),
      organization: {
        id: 10,
        name: 'Acme',
        slug: 'acme',
      },
      status: 'ACTIVE',
    });
  });
});
