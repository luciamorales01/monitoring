import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IncidentStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

type AuthenticatedUser = {
  organizationId: number;
  userId: number;
};

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(user: AuthenticatedUser) {
    return this.prisma.incident.findMany({
      where: {
        monitor: {
          organizationId: user.organizationId,
        },
      },
      include: {
        monitor: true,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });
  }

  findActive(user: AuthenticatedUser) {
    return this.prisma.incident.findMany({
      where: {
        status: IncidentStatus.OPEN,
        monitor: {
          organizationId: user.organizationId,
        },
      },
      include: {
        monitor: true,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: {
        monitor: true,
      },
    });

    if (!incident) {
      throw new NotFoundException('Incidencia no encontrada');
    }

    if (incident.monitor.organizationId !== user.organizationId) {
      throw new ForbiddenException('No tienes acceso a esta incidencia');
    }

    return incident;
  }

  async update(
    id: number,
    dto: { status?: 'OPEN' | 'RESOLVED' },
    user: AuthenticatedUser,
  ) {
    const incident = await this.findOne(id, user);

    if (!dto.status) {
      return incident;
    }

    if (!Object.values(IncidentStatus).includes(dto.status)) {
      throw new BadRequestException('Estado de incidencia no valido');
    }

    if (dto.status === IncidentStatus.RESOLVED) {
      const resolvedAt = incident.resolvedAt ?? new Date();
      const durationSeconds = Math.max(
        0,
        Math.floor(
          (resolvedAt.getTime() - incident.startedAt.getTime()) / 1000,
        ),
      );

      return this.prisma.incident.update({
        where: { id },
        data: {
          status: IncidentStatus.RESOLVED,
          resolvedAt,
          durationSeconds,
        },
        include: {
          monitor: true,
        },
      });
    }

    return this.prisma.incident.update({
      where: { id },
      data: {
        status: IncidentStatus.OPEN,
        resolvedAt: null,
        durationSeconds: null,
      },
      include: {
        monitor: true,
      },
    });
  }
}
