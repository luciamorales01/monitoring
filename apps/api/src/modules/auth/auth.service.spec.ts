import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    $transaction: jest.Mock;
    auditLog: { create: jest.Mock };
    user: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    userInvitation: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((callback) => callback(prisma)),
      auditLog: { create: jest.fn() },
      user: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      userInvitation: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('rejects expired invitations', async () => {
    prisma.userInvitation.findFirst.mockResolvedValue({
      id: 1,
      email: 'pending@example.com',
      role: UserRole.ADMIN,
      expiresAt: new Date('2026-05-01T10:00:00.000Z'),
      acceptedAt: null,
      organizationId: 10,
    });

    await expect(
      service.acceptInvitation({
        name: 'Pending User',
        password: '123456',
        token: 'plain-token',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects inactive users on login', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'inactive@example.com',
      name: 'Inactive',
      passwordHash: await bcrypt.hash('123456', 10),
      role: UserRole.ADMIN,
      status: UserStatus.INACTIVE,
      organizationId: 10,
    });

    await expect(
      service.login({ email: 'inactive@example.com', password: '123456' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
