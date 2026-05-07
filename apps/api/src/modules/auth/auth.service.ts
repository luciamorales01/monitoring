import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma/prisma.service';
import { LoginDto } from './login.dto';
import { RegisterDto } from './register.dto';

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

    const accessToken = this.signToken(
      user.id,
      user.email,
      user.role as UserRoleValue,
      user.organizationId,
    );

    return {
      accessToken,
      user: this.toAuthUser(user as AuthUserInput),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Usuario inactivo o pendiente de activación');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = this.signToken(
      user.id,
      user.email,
      user.role as UserRoleValue,
      user.organizationId,
    );

    return {
      accessToken,
      user: this.toAuthUser(user as AuthUserInput),
    };
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
      throw new UnauthorizedException('Usuario inactivo o pendiente de activación');
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
}