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
import { UpdateCurrentUserDto } from './update-current-user.dto';
import { UpdateAvatarDto } from './update-avatar.dto';

type AuthenticatedUser = {
  organizationId: number;
  userId: number;
  role?: string;
};

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_DATA_URL_PATTERN =
  /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

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
      throw new ForbiddenException(
        'No puedes editar usuarios de otra organización.',
      );
    }

    this.ensureCanManageUser(user, existingUser.role);

    if (existingUser.id === user.userId && dto.role !== undefined) {
      throw new ForbiddenException('No puedes cambiar tu propio rol.');
    }

    if (
      dto.role !== undefined &&
      dto.role === UserRole.OWNER &&
      user.role !== UserRole.OWNER
    ) {
      throw new ForbiddenException(
        'Solo un propietario puede asignar el rol OWNER.',
      );
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

  async getCurrentUser(user: AuthenticatedUser) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
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

    if (!currentUser) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return this.toSafeUser(currentUser);
  }

  async updateCurrentUser(dto: UpdateCurrentUserDto, user: AuthenticatedUser) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
    });

    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase();
    if (dto.phone !== undefined) data.phone = dto.phone.trim();
    if (dto.timezone !== undefined) data.timezone = dto.timezone.trim();
    if (dto.language !== undefined) data.language = this.normalizeLanguage(dto.language);

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: user.userId },
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

  async updateCurrentUserAvatar(dto: UpdateAvatarDto, user: AuthenticatedUser) {
    const avatarUrl =
      dto.dataUrl === null || dto.dataUrl === undefined
        ? null
        : this.validateAvatarDataUrl(dto.dataUrl);

    const updatedUser = await this.prisma.user.update({
      where: { id: user.userId },
      data: { avatarUrl },
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
  }

  async updateStatus(
    id: number,
    dto: UpdateUserStatusDto,
    user: AuthenticatedUser,
  ) {
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
      throw new ForbiddenException(
        'No puedes modificar usuarios de otra organización.',
      );
    }

    if (existingUser.id === user.userId) {
      throw new ForbiddenException('No puedes desactivar tu propio usuario.');
    }

    this.ensureCanManageUser(user, existingUser.role);

    if (dto.status === UserStatus.PENDING) {
      throw new BadRequestException(
        'El estado PENDING solo se usa para invitaciones.',
      );
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

    return invitations.map((invitation) =>
      this.serializeInvitation(invitation),
    );
  }

  async createInvitation(dto: CreateInvitationDto, user: AuthenticatedUser) {
    if (user.role !== UserRole.OWNER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permisos para invitar usuarios.');
    }

    if (dto.role === UserRole.OWNER && user.role !== UserRole.OWNER) {
      throw new ForbiddenException(
        'Solo un propietario puede invitar propietarios.',
      );
    }

    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser && existingUser.organizationId === user.organizationId) {
      throw new ConflictException(
        'Ese usuario ya pertenece a tu organización.',
      );
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
      throw new ConflictException(
        'Ya existe una invitación activa para ese email.',
      );
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
      inviteToken:
        this.configService.get('NODE_ENV') !== 'production' ? token : undefined,
    };
  }

  async revokeInvitation(id: number, user: AuthenticatedUser) {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada.');
    }

    if (invitation.organizationId !== user.organizationId) {
      throw new ForbiddenException(
        'No puedes revocar invitaciones de otra organización.',
      );
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException(
        'No puedes revocar una invitación aceptada.',
      );
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
      throw new ForbiddenException(
        'No puedes gestionar usuarios propietarios.',
      );
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
    const hours = Number(
      this.configService.get<string>('INVITATION_TOKEN_HOURS') ?? 72,
    );
    return Number.isFinite(hours) && hours > 0
      ? hours * 60 * 60 * 1000
      : 72 * 60 * 60 * 1000;
  }

  private normalizeLanguage(language: string) {
    return language.trim().toLowerCase() === 'en' ? 'en' : 'es';
  }

  private validateAvatarDataUrl(dataUrl: string) {
    const match = AVATAR_DATA_URL_PATTERN.exec(dataUrl);

    if (!match) {
      throw new BadRequestException('La imagen debe ser JPG, PNG o WebP.');
    }

    const [, mimeType, base64Payload] = match;
    const imageBuffer = Buffer.from(base64Payload, 'base64');

    if (imageBuffer.length === 0 || imageBuffer.length > MAX_AVATAR_BYTES) {
      throw new BadRequestException('La imagen no puede superar 2 MB.');
    }

    if (!this.matchesImageSignature(mimeType, imageBuffer)) {
      throw new BadRequestException('El contenido de la imagen no es válido.');
    }

    return `data:${mimeType === 'image/jpg' ? 'image/jpeg' : mimeType};base64,${base64Payload}`;
  }

  private matchesImageSignature(mimeType: string, imageBuffer: Buffer) {
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return (
        imageBuffer.length >= 3 &&
        imageBuffer[0] === 0xff &&
        imageBuffer[1] === 0xd8 &&
        imageBuffer[2] === 0xff
      );
    }

    if (mimeType === 'image/png') {
      return (
        imageBuffer.length >= 8 &&
        imageBuffer[0] === 0x89 &&
        imageBuffer[1] === 0x50 &&
        imageBuffer[2] === 0x4e &&
        imageBuffer[3] === 0x47 &&
        imageBuffer[4] === 0x0d &&
        imageBuffer[5] === 0x0a &&
        imageBuffer[6] === 0x1a &&
        imageBuffer[7] === 0x0a
      );
    }

    return (
      imageBuffer.length >= 12 &&
      imageBuffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      imageBuffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }

  private toSafeUser<T extends { passwordHash: string }>(user: T) {
    const { passwordHash, ...safeUser } = user;
    void passwordHash;

    return safeUser;
  }
}
