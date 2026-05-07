import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    compare: jest.fn(),
    hash: jest.fn(),
  },
}));

describe('AuthService', () => {
  let service: AuthService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const jwtService = {
    sign: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects login with invalid email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'missing@example.com',
        password: '123456',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects login with invalid password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'ana@example.com',
      passwordHash: 'hashed-password',
      organizationId: 10,
      organization: {
        id: 10,
        name: 'Acme',
        slug: 'acme',
      },
      role: 'OWNER',
      status: 'ACTIVE',
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({
        email: 'ana@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.skip('returns access token on valid login', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: 'hashed-password',
      organizationId: 10,
      organization: {
        id: 10,
        name: 'Acme',
        slug: 'acme',
      },
      role: 'OWNER',
      status: 'ACTIVE',
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    prisma.user.update.mockResolvedValue({});
    jwtService.sign.mockReturnValue('signed-token');

    const result = await service.login({
      email: 'ana@example.com',
      password: '123456',
    });

    expect(prisma.user.update).toHaveBeenCalled();

    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'signed-token',
        user: expect.objectContaining({
          id: 1,
          email: 'ana@example.com',
          role: 'OWNER',
        }),
      }),
    );
  });
});