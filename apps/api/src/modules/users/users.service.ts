import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { UpdateUserDto } from './update-user.dto';

type AuthenticatedUser = {
  organizationId: number;
  userId: number;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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

    const data: Prisma.UserUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
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

  private toSafeUser<T extends { passwordHash: string }>(user: T) {
    const { passwordHash, ...safeUser } = user;

    void passwordHash;

    return {
      ...safeUser,
      status: 'ACTIVE' as const,
    };
  }
}
