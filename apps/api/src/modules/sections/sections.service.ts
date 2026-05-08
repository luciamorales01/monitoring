import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { MonitorsService } from '../monitors/monitors.service';
import { CreateSectionDto } from './create-section.dto';
import { UpdateSectionDto } from './update-section.dto';

type AuthenticatedUser = { organizationId: number; userId: number };

@Injectable()
export class SectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly monitorsService: MonitorsService,
  ) {}

  async findAll(user: AuthenticatedUser) {
    const sections = await this.prisma.section.findMany({
      where: { organizationId: user.organizationId },
      include: { monitors: { include: { monitor: true }, orderBy: { assignedAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return sections.map((section) => this.serializeSection(section));
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const section = await this.prisma.section.findUnique({
      where: { id },
      include: { monitors: { include: { monitor: true }, orderBy: { assignedAt: 'asc' } } },
    });
    if (!section) throw new NotFoundException('Sección no encontrada');
    this.ensureSectionAccess(section.organizationId, user);
    return this.serializeSection(section);
  }

  async create(dto: CreateSectionDto, user: AuthenticatedUser) {
    const monitorIds = await this.validateMonitorIds(dto.monitorIds ?? [], user);
    const section = await this.prisma.section.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() ?? '',
        icon: dto.icon ?? 'folder',
        organizationId: user.organizationId,
        monitors: { create: monitorIds.map((monitorId) => ({ monitorId })) },
      },
      include: { monitors: { include: { monitor: true }, orderBy: { assignedAt: 'asc' } } },
    });
    return this.serializeSection(section);
  }

  async update(id: number, dto: UpdateSectionDto, user: AuthenticatedUser) {
    const current = await this.prisma.section.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Sección no encontrada');
    this.ensureSectionAccess(current.organizationId, user);
    const monitorIds = dto.monitorIds === undefined ? undefined : await this.validateMonitorIds(dto.monitorIds, user);

    const section = await this.prisma.$transaction(async (tx) => {
      if (monitorIds !== undefined) {
        await tx.sectionMonitor.deleteMany({ where: { sectionId: id } });
        if (monitorIds.length > 0) {
          await tx.sectionMonitor.createMany({
            data: monitorIds.map((monitorId) => ({ sectionId: id, monitorId })),
            skipDuplicates: true,
          });
        }
      }
      return tx.section.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
          ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
        },
        include: { monitors: { include: { monitor: true }, orderBy: { assignedAt: 'asc' } } },
      });
    });
    return this.serializeSection(section);
  }

  async remove(id: number, user: AuthenticatedUser) {
    const section = await this.prisma.section.findUnique({ where: { id } });
    if (!section) throw new NotFoundException('Sección no encontrada');
    this.ensureSectionAccess(section.organizationId, user);
    await this.prisma.section.delete({ where: { id } });
    return { ok: true };
  }

  async runSectionChecks(id: number, user: AuthenticatedUser) {
    const section = await this.prisma.section.findUnique({
      where: { id },
      include: { monitors: { include: { monitor: true } } },
    });
    if (!section) throw new NotFoundException('Sección no encontrada');
    this.ensureSectionAccess(section.organizationId, user);
    const results: Awaited<ReturnType<typeof this.monitorsService.runCheck>>[] = [];
    for (const item of section.monitors) {
      if (!item.monitor.isActive) continue;
      results.push(await this.monitorsService.runCheck(item.monitorId, user));
    }
    return { checked: results.length, results };
  }

  private async validateMonitorIds(monitorIds: number[], user: AuthenticatedUser) {
    const uniqueIds = Array.from(new Set(monitorIds.filter(Number.isInteger)));
    if (uniqueIds.length === 0) return [];
    const count = await this.prisma.monitor.count({
      where: { id: { in: uniqueIds }, organizationId: user.organizationId },
    });
    if (count !== uniqueIds.length) {
      throw new BadRequestException('Algún monitor no existe o no pertenece a tu organización');
    }
    return uniqueIds;
  }

  private ensureSectionAccess(sectionOrganizationId: number, user: AuthenticatedUser) {
    if (sectionOrganizationId !== user.organizationId) {
      throw new ForbiddenException('No tienes acceso a esta sección');
    }
  }

  private serializeSection(section: any) {
    const monitors = section.monitors?.map((item: any) => item.monitor) ?? [];
    return {
      id: String(section.id),
      name: section.name,
      description: section.description ?? '',
      icon: section.icon,
      monitorIds: monitors.map((monitor: any) => monitor.id),
      monitors,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
    };
  }
}
