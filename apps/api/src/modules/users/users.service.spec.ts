import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
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
    role: 'OWNER',
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
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
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
      status: 'ACTIVE',
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

  it('updates current user language using normalized values', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 20,
      name: 'Ana',
      email: 'ana@example.com',
      role: 'OWNER',
      passwordHash: 'secret',
      organizationId: 10,
    });
    prisma.user.update.mockResolvedValue({
      id: 20,
      name: 'Ana',
      email: 'ana@example.com',
      role: 'OWNER',
      passwordHash: 'secret',
      organizationId: 10,
      language: 'en',
      organization: { id: 10, name: 'Acme', slug: 'acme' },
    });

    await service.updateCurrentUser({ language: 'en' }, user);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: user.userId },
        data: { language: 'en' },
      }),
    );
  });

  it('updates current user avatar when data URL is valid', async () => {
    const pngDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

    prisma.user.update.mockResolvedValue({
      id: 20,
      name: 'Ana',
      email: 'ana@example.com',
      role: 'OWNER',
      passwordHash: 'secret',
      organizationId: 10,
      avatarUrl: pngDataUrl,
      organization: { id: 10, name: 'Acme', slug: 'acme' },
    });

    const result = await service.updateCurrentUserAvatar(
      { dataUrl: pngDataUrl },
      user,
    );

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: user.userId },
        data: { avatarUrl: pngDataUrl },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        avatarUrl: pngDataUrl,
      }),
    );
  });

  it('rejects invalid avatar payloads', async () => {
    await expect(
      service.updateCurrentUserAvatar(
        { dataUrl: 'data:image/png;base64,ZmFrZQ==' },
        user,
      ),
    ).rejects.toThrow('El contenido de la imagen no es válido.');
  });
});
