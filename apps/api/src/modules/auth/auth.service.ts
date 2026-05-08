import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../database/prisma/prisma.service';
import { LoginDto } from './login.dto';
import { RegisterDto } from './register.dto';
import { ForgotPasswordDto } from './forgot-password.dto';
import { ResetPasswordDto } from './reset-password.dto';
import { ChangePasswordDto } from './change-password.dto';
import { AcceptInvitationDto } from './accept-invitation.dto';

const UserRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  VIEWER: 'VIEWER',
} as const;

const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING: 'PENDING',
} as const;

type UserRoleValue = (typeof UserRole)[keyof typeof UserRole];
type UserStatusValue = (typeof UserStatus)[keyof typeof UserStatus];

type AuthUserInput = {
  id: number;
  name: string;
  email: string;
  role: UserRoleValue;
  status: UserStatusValue;
  organizationId: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('El email ya está en uso');
    }

    const slugBase = dto.organizationName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    let slug = slugBase || 'organization';
    let counter = 1;

    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      slug = `${slugBase || 'organization'}-${counter++}`;
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const { user } = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug,
        },
      });

      const user = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          role: UserRole.OWNER,
          status: UserStatus.ACTIVE,
          organizationId: organization.id,
        },
      });

      return { organization, user };
    });

    return this.buildSession(user as AuthUserInput, true);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Usuario inactivo o pendiente de activación',
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.buildSession(user as AuthUserInput, Boolean(dto.rememberMe));
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException(
        'Sesión expirada. Vuelve a iniciar sesión.',
      );
    }

    if (storedToken.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Usuario inactivo o pendiente de activación',
      );
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return this.buildSession(
      storedToken.user as AuthUserInput,
      storedToken.rememberMe,
    );
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      return {
        message:
          'Si el email existe, recibirás instrucciones para restablecer la contraseña.',
      };
    }

    const resetToken = this.createOpaqueToken();
    const expiresAt = new Date(Date.now() + this.getResetTokenTtlMs());

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        tokenHash: this.hashToken(resetToken),
        expiresAt,
      },
    });

    const origins =
      this.configService.get<string>('CORS_ORIGINS')?.split(',') ?? [];

    const appUrl =
  this.configService.get<string>('FRONTEND_URL') ??
  'http://localhost:5173';

    const resetUrl = `${appUrl.replace(/\/$/, '')}/restablecer-password?token=${encodeURIComponent(resetToken)}`;

    const payload: { message: string; resetUrl?: string; resetToken?: string } =
      {
        message:
          'Si el email existe, recibirás instrucciones para restablecer la contraseña.',
      };

    if (this.configService.get('NODE_ENV') !== 'production') {
      payload.resetUrl = resetUrl;
      payload.resetToken = resetToken;
    }

    // La integración SMTP real se puede conectar aquí. En desarrollo se devuelve resetUrl para poder probar el flujo.
    return payload;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);
    const storedToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !storedToken ||
      storedToken.usedAt ||
      storedToken.expiresAt <= new Date()
    ) {
      throw new BadRequestException(
        'El enlace de recuperación no es válido o ha caducado.',
      );
    }

    if (storedToken.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Usuario inactivo o pendiente de activación',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: storedToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: storedToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { success: true };
  }


  async acceptInvitation(dto: AcceptInvitationDto) {
    const tokenHash = this.hashToken(dto.token);
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { tokenHash },
      include: { organization: true },
    });

    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.revokedAt ||
      invitation.expiresAt <= new Date()
    ) {
      throw new BadRequestException('La invitación no es válida o ha caducado.');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      throw new BadRequestException('Ya existe una cuenta con este email.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: dto.name.trim(),
          email: invitation.email,
          passwordHash,
          role: invitation.role,
          status: UserStatus.ACTIVE,
          organizationId: invitation.organizationId,
        },
      });

      await tx.userInvitation.update({
        where: { id: invitation.id },
        data: {
          acceptedAt: new Date(),
          acceptedById: createdUser.id,
        },
      });

      return createdUser;
    });

    return this.buildSession(user as AuthUserInput, true);
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    const passwordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!passwordValid) {
      throw new BadRequestException('La contraseña actual no es correcta.');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser distinta a la actual.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { success: true };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Usuario inactivo o pendiente de activación',
      );
    }

    return {
      ...this.toAuthUser(user as AuthUserInput),
      organization: user.organization
        ? {
            id: user.organization.id,
            name: user.organization.name,
            slug: user.organization.slug,
          }
        : null,
    };
  }

  private async buildSession(user: AuthUserInput, rememberMe: boolean) {
    const accessToken = this.signToken(
      user.id,
      user.email,
      user.role as UserRoleValue,
      user.organizationId,
    );

    const refreshToken = this.createOpaqueToken();
    const expiresAt = new Date(
      Date.now() + this.getRefreshTokenTtlMs(rememberMe),
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        tokenHash: this.hashToken(refreshToken),
        rememberMe,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: this.toAuthUser(user),
    };
  }

  private toAuthUser(user: AuthUserInput) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      organizationId: user.organizationId,
    };
  }

  private signToken(
    userId: number,
    email: string,
    role: UserRoleValue,
    organizationId: number,
  ) {
    return this.jwtService.sign({
      sub: userId,
      email,
      role,
      organizationId,
    });
  }

  private createOpaqueToken() {
    return randomBytes(48).toString('hex');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private getRefreshTokenTtlMs(rememberMe: boolean) {
    const envValue = rememberMe
      ? this.configService.get<string>('JWT_REMEMBER_ME_EXPIRES_IN')
      : this.configService.get<string>('JWT_REFRESH_EXPIRES_IN');

    const seconds = Number(
      envValue ?? (rememberMe ? 60 * 60 * 24 * 365 : 60 * 60 * 24),
    );
    return Number.isFinite(seconds) && seconds > 0
      ? seconds * 1000
      : 24 * 60 * 60 * 1000;
  }

  private getResetTokenTtlMs() {
    const minutes = Number(
      this.configService.get<string>('PASSWORD_RESET_TOKEN_MINUTES') ?? 30,
    );
    return Number.isFinite(minutes) && minutes > 0
      ? minutes * 60 * 1000
      : 30 * 60 * 1000;
  }
}
