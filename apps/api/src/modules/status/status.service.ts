import { Injectable, NotFoundException } from '@nestjs/common';
import { IncidentStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class StatusService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicStatus(organizationSlug: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { slug: organizationSlug },
      select: { id: true, name: true, slug: true },
    });

    if (!organization) throw new NotFoundException('Página de estado no encontrada');

    const [monitors, openIncidents] = await Promise.all([
      this.prisma.monitor.findMany({
        where: { organizationId: organization.id, isActive: true },
        select: {
          id: true,
          name: true,
          target: true,
          currentStatus: true,
          lastResponseTime: true,
          lastCheckedAt: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.incident.findMany({
        where: {
          status: { in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED] },
          monitor: { organizationId: organization.id },
        },
        select: {
          id: true,
          title: true,
          status: true,
          severity: true,
          startedAt: true,
          monitor: { select: { id: true, name: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: 20,
      }),
    ]);

    const degraded = monitors.some((monitor) => monitor.currentStatus === 'DOWN');
    const unknown = monitors.some((monitor) => monitor.currentStatus === 'UNKNOWN');

    return {
      organization,
      generatedAt: new Date(),
      overallStatus: degraded ? 'DEGRADED' : unknown ? 'PARTIAL' : 'OPERATIONAL',
      monitors,
      openIncidents,
    };
  }
}
