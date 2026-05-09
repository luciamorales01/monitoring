import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { IncidentSeverity, IncidentStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { MonitoringEventName } from '../events/events.types';
import { UpdateIncidentDto } from './update-incident.dto';

type AuthenticatedUser = {
  organizationId: number;
  userId: number;
};

@Injectable()
export class IncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  findAll(user: AuthenticatedUser) {
    return this.prisma.incident.findMany({
      where: { monitor: { organizationId: user.organizationId } },
      include: { monitor: true },
      orderBy: { startedAt: 'desc' },
    });
  }

  findActive(user: AuthenticatedUser) {
    return this.prisma.incident.findMany({
      where: {
        status: { in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED] },
        monitor: { organizationId: user.organizationId },
      },
      include: { monitor: true },
      orderBy: [{ severity: 'desc' }, { startedAt: 'desc' }],
    });
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: { monitor: true },
    });

    if (!incident) throw new NotFoundException('Incidencia no encontrada');
    if (incident.monitor.organizationId !== user.organizationId) {
      throw new ForbiddenException('No tienes acceso a esta incidencia');
    }

    return incident;
  }

  async acknowledge(id: number, user: AuthenticatedUser) {
    const incident = await this.findOne(id, user);
    if (incident.status === IncidentStatus.RESOLVED) return incident;

    const updatedIncident = await this.prisma.incident.update({
      where: { id },
      data: {
        status: IncidentStatus.ACKNOWLEDGED,
        acknowledgedAt: incident.acknowledgedAt ?? new Date(),
        acknowledgedById: user.userId,
        lastStatusChangeAt: new Date(),
      },
      include: { monitor: true },
    });

    return updatedIncident;
  }

  async resolve(id: number, dto: UpdateIncidentDto, user: AuthenticatedUser) {
    const incident = await this.findOne(id, user);
    const resolvedAt = incident.resolvedAt ?? new Date();
    const durationSeconds = Math.max(
      0,
      Math.floor((resolvedAt.getTime() - incident.startedAt.getTime()) / 1000),
    );

    const updatedIncident = await this.prisma.incident.update({
      where: { id },
      data: {
        status: IncidentStatus.RESOLVED,
        resolvedAt,
        resolvedById: user.userId,
        durationSeconds,
        resolutionNote: dto.resolutionNote?.trim() || incident.resolutionNote,
        rootCause: dto.rootCause?.trim() || incident.rootCause,
        lastStatusChangeAt: new Date(),
      },
      include: { monitor: true },
    });

    if (incident.status !== IncidentStatus.RESOLVED) {
      await this.publishIncidentResolved(updatedIncident);
    }

    return updatedIncident;
  }

  async updateSeverity(id: number, severity: IncidentSeverity, user: AuthenticatedUser) {
    await this.findOne(id, user);
    return this.prisma.incident.update({
      where: { id },
      data: { severity, lastStatusChangeAt: new Date() },
      include: { monitor: true },
    });
  }

  async update(id: number, dto: UpdateIncidentDto, user: AuthenticatedUser) {
    const incident = await this.findOne(id, user);
    const data: Record<string, unknown> = {};

    if (dto.severity) data.severity = dto.severity;
    if (dto.rootCause !== undefined) data.rootCause = dto.rootCause.trim() || null;
    if (dto.resolutionNote !== undefined) data.resolutionNote = dto.resolutionNote.trim() || null;

    if (dto.status === IncidentStatus.ACKNOWLEDGED && incident.status !== IncidentStatus.RESOLVED) {
      data.status = IncidentStatus.ACKNOWLEDGED;
      data.acknowledgedAt = incident.acknowledgedAt ?? new Date();
      data.acknowledgedById = user.userId;
    }

    if (dto.status === IncidentStatus.OPEN) {
      data.status = IncidentStatus.OPEN;
      data.resolvedAt = null;
      data.resolvedById = null;
      data.durationSeconds = null;
    }

    if (dto.status === IncidentStatus.RESOLVED) {
      const resolvedAt = incident.resolvedAt ?? new Date();
      data.status = IncidentStatus.RESOLVED;
      data.resolvedAt = resolvedAt;
      data.resolvedById = user.userId;
      data.durationSeconds = Math.max(
        0,
        Math.floor((resolvedAt.getTime() - incident.startedAt.getTime()) / 1000),
      );
    }

    if (Object.keys(data).length === 0) return incident;
    data.lastStatusChangeAt = new Date();

    const updatedIncident = await this.prisma.incident.update({
      where: { id },
      data,
      include: { monitor: true },
    });

    if (
      incident.status !== IncidentStatus.RESOLVED &&
      updatedIncident.status === IncidentStatus.RESOLVED
    ) {
      await this.publishIncidentResolved(updatedIncident);
    }

    return updatedIncident;
  }

  private async publishIncidentResolved(incident: {
    id: number;
    monitorId: number;
    monitor: { organizationId: number };
    resolvedAt: Date | null;
  }) {
    await this.eventsService.publish({
      name: MonitoringEventName.INCIDENT_RESOLVED,
      payload: {
        incidentId: incident.id,
        monitorId: incident.monitorId,
        organizationId: incident.monitor.organizationId,
        resolvedAt: (incident.resolvedAt ?? new Date()).toISOString(),
      },
    });
  }
}
