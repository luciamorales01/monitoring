import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateInvitationDto } from './create-invitation.dto';
import { UpdateUserStatusDto } from './update-user-status.dto';
import { UpdateUserDto } from './update-user.dto';

type AuthenticatedUser = {
  organizationId: number;
  userId: number;
  role?: string;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(user: AuthenticatedUser) {
    const users = await this.prisma.user.findMany({
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

    return users.map((currentUser) => this.toSafeUser(currentUser));
  }

  async update(id: number, dto: UpdateUserDto, user: AuthenticatedUser) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
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

    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    if (existingUser.organizationId !== user.organizationId) {
      throw new ForbiddenException('No puedes editar usuarios de otra organización.');
    }

    this.ensureCanManageUser(user, existingUser.role);

    if (existingUser.id === user.userId && dto.role !== undefined) {
      throw new ForbiddenException('No puedes cambiar tu propio rol.');
    }

    if (dto.role !== undefined && dto.role === UserRole.OWNER && user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Solo un propietario puede asignar el rol OWNER.');
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase();
    if (dto.role !== undefined) data.role = dto.role;

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data,
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

      return this.toSafeUser(updatedUser);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe un usuario con ese email.');
      }

      throw error;
    }
  }

  async updateStatus(id: number, dto: UpdateUserStatusDto, user: AuthenticatedUser) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    if (existingUser.organizationId !== user.organizationId) {
      throw new ForbiddenException('No puedes modificar usuarios de otra organización.');
    }

    if (existingUser.id === user.userId) {
      throw new ForbiddenException('No puedes desactivar tu propio usuario.');
    }

    this.ensureCanManageUser(user, existingUser.role);

    if (dto.status === UserStatus.PENDING) {
      throw new BadRequestException('El estado PENDING solo se usa para invitaciones.');
    }

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { status: dto.status },
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      });

      if (dto.status !== UserStatus.ACTIVE) {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      return updated;
    });

    return this.toSafeUser(updatedUser);
  }

  async listInvitations(user: AuthenticatedUser) {
    const invitations = await this.prisma.userInvitation.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((invitation) => this.serializeInvitation(invitation));
  }

  async createInvitation(dto: CreateInvitationDto, user: AuthenticatedUser) {
    if (user.role !== UserRole.OWNER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permisos para invitar usuarios.');
    }

    if (dto.role === UserRole.OWNER && user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Solo un propietario puede invitar propietarios.');
    }

    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.organizationId === user.organizationId) {
      throw new ConflictException('Ese usuario ya pertenece a tu organización.');
    }

    const activeInvitation = await this.prisma.userInvitation.findFirst({
      where: {
        email,
        organizationId: user.organizationId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (activeInvitation) {
      throw new ConflictException('Ya existe una invitación activa para ese email.');
    }

    const token = this.createOpaqueToken();
    const expiresAt = new Date(Date.now() + this.getInvitationTtlMs());

    const invitation = await this.prisma.userInvitation.create({
      data: {
        email,
        role: dto.role,
        tokenHash: this.hashToken(token),
        organizationId: user.organizationId,
        invitedById: user.userId,
        expiresAt,
      },
    });

    return {
      ...this.serializeInvitation(invitation),
      inviteUrl: this.buildInvitationUrl(token),
      inviteToken: this.configService.get('NODE_ENV') !== 'production' ? token : undefined,
    };
  }

  async revokeInvitation(id: number, user: AuthenticatedUser) {
    const invitation = await this.prisma.userInvitation.findUnique({ where: { id } });

    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada.');
    }

    if (invitation.organizationId !== user.organizationId) {
      throw new ForbiddenException('No puedes revocar invitaciones de otra organización.');
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException('No puedes revocar una invitación aceptada.');
    }

    const updated = await this.prisma.userInvitation.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    return this.serializeInvitation(updated);
  }

  private ensureCanManageUser(user: AuthenticatedUser, targetRole: UserRole) {
    if (user.role === UserRole.OWNER) return;

    if (targetRole === UserRole.OWNER) {
      throw new ForbiddenException('No puedes gestionar usuarios propietarios.');
    }
  }

  private buildInvitationUrl(token: string) {
    const appUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

    return `${appUrl.replace(/\/$/, '')}/aceptar-invitacion?token=${encodeURIComponent(token)}`;
  }

  private serializeInvitation(invitation: {
    id: number;
    email: string;
    role: UserRole;
    organizationId: number;
    expiresAt: Date;
    acceptedAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const now = Date.now();
    const status = invitation.acceptedAt
      ? 'ACCEPTED'
      : invitation.revokedAt
        ? 'REVOKED'
        : invitation.expiresAt.getTime() <= now
          ? 'EXPIRED'
          : 'PENDING';

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      organizationId: invitation.organizationId,
      status,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      revokedAt: invitation.revokedAt,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    };
  }

  private createOpaqueToken() {
    return randomBytes(48).toString('hex');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private getInvitationTtlMs() {
    const hours = Number(this.configService.get<string>('INVITATION_TOKEN_HOURS') ?? 72);
    return Number.isFinite(hours) && hours > 0 ? hours * 60 * 60 * 1000 : 72 * 60 * 60 * 1000;
  }

  private toSafeUser<T extends { passwordHash: string }>(user: T) {
    const { passwordHash, ...safeUser } = user;
    void passwordHash;

    return safeUser;
  }
}
