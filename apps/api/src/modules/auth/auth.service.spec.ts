import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { buildNotificationJobId } from '../notifications/notifications.queue-contract';
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
    passwordResetToken: {
      create: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const jwtService = {
    sign: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };
  const notificationsService = {
    notifyPasswordReset: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService,
      notificationsService as unknown as NotificationsService,
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

  it('forgot-password enqueues reset email with a BullMQ-safe job id', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 42,
      name: 'Ana',
      email: 'ana@example.com',
      organizationId: 10,
      passwordHash: 'hashed-password',
      role: 'OWNER',
      status: 'ACTIVE',
    });
    prisma.passwordResetToken.create.mockResolvedValue({ id: 99 });
    configService.get.mockImplementation((key: string) => {
      if (key === 'FRONTEND_URL') return 'http://localhost:5173';
      if (key === 'NODE_ENV') return 'production';
      return undefined;
    });
    notificationsService.notifyPasswordReset.mockImplementation((payload) => {
      const jobId = buildNotificationJobId({
        kind: 'password-reset',
        email: {
          html: `<a href="${payload.resetUrl}">reset</a>`,
          subject: 'Reset',
          text: payload.resetUrl,
          to: [payload.email],
        },
        organizationId: payload.organizationId,
        requestedAt: new Date('2026-05-13T06:00:00.000Z').toISOString(),
        userId: payload.userId,
      });

      expect(jobId).not.toContain(':');
      expect(jobId).not.toContain(payload.email);
      expect(jobId).not.toContain(payload.resetUrl);
      return Promise.resolve();
    });

    await expect(
      service.forgotPassword({ email: 'ana@example.com' }),
    ).resolves.toEqual({
      message:
        'Si el email existe, recibirás instrucciones para restablecer la contraseña.',
    });

    expect(notificationsService.notifyPasswordReset).toHaveBeenCalledTimes(1);
  });
});
