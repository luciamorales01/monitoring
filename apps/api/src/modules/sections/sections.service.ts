import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { MonitorsService } from '../monitors/monitors.service';
import { CreateSectionDto } from './create-section.dto';
import { UpdateSectionDto } from './update-section.dto';
import { UpdateSectionMembersDto } from './update-section-members.dto';

type AuthenticatedUser = { organizationId: number; userId: number; role?: string };

type SectionWithRelations = Prisma.SectionGetPayload<{
  include: {
    members: { include: { user: true }; orderBy: { createdAt: 'asc' } };
    monitors: { include: { monitor: true }; orderBy: { assignedAt: 'asc' } };
  };
}>;

@Injectable()
export class SectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly monitorsService: MonitorsService,
  ) {}

  async findAll(user: AuthenticatedUser) {
    const sections = await this.prisma.section.findMany({
      where: this.buildSectionWhere(user),
      include: this.sectionInclude,
      orderBy: { createdAt: 'desc' },
    });
    return sections.map((section) => this.serializeSection(section));
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const section = await this.prisma.section.findUnique({
      where: { id },
      include: this.sectionInclude,
    });
    if (!section) throw new NotFoundException('Sección no encontrada');
    this.ensureSectionAccess(section, user);
    return this.serializeSection(section);
  }

  async create(dto: CreateSectionDto, user: AuthenticatedUser) {
    const monitorIds = await this.validateMonitorIds(dto.monitorIds ?? [], user);
    const locations = this.sanitizeConfiguredLocations(dto.locations);
    const defaultMembers = await this.buildDefaultMembers(user);
    const section = await this.prisma.section.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() ?? '',
        icon: dto.icon ?? 'folder',
        expectedStatusCode: dto.expectedStatusCode ?? 200,
        frequencySeconds: dto.frequencySeconds ?? 60,
        timeoutSeconds: dto.timeoutSeconds ?? 10,
        locations,
        isActive: dto.isActive ?? true,
        organizationId: user.organizationId,
        ...(monitorIds.length > 0
          ? { monitors: { create: monitorIds.map((monitorId) => ({ monitorId })) } }
          : {}),
        ...(defaultMembers.length > 0 ? { members: { create: defaultMembers } } : {}),
      },
      include: this.sectionInclude,
    });
    await this.applySectionScheduleToMonitors(section.id, monitorIds, section);
    const refreshedSection = await this.prisma.section.findUniqueOrThrow({
      where: { id: section.id },
      include: this.sectionInclude,
    });
    return this.serializeSection(refreshedSection);
  }

  async update(id: number, dto: UpdateSectionDto, user: AuthenticatedUser) {
    const current = await this.prisma.section.findUnique({
      where: { id },
      include: this.sectionInclude,
    });
    if (!current) throw new NotFoundException('Sección no encontrada');
    this.ensureSectionAccess(current, user);
    const monitorIds = dto.monitorIds === undefined ? undefined : await this.validateMonitorIds(dto.monitorIds, user);
    const scheduleChanged = this.hasScheduleChange(dto);
    const locations = dto.locations === undefined ? undefined : this.sanitizeConfiguredLocations(dto.locations);

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
      const updatedSection = await tx.section.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
          ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
          ...(dto.expectedStatusCode !== undefined ? { expectedStatusCode: dto.expectedStatusCode } : {}),
          ...(dto.frequencySeconds !== undefined ? { frequencySeconds: dto.frequencySeconds } : {}),
          ...(dto.timeoutSeconds !== undefined ? { timeoutSeconds: dto.timeoutSeconds } : {}),
          ...(locations !== undefined ? { locations } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        include: this.sectionInclude,
      });

      const idsToSync =
        monitorIds ??
        updatedSection.monitors
          .filter(({ monitor }) => monitor.usesSectionSchedule)
          .map(({ monitorId }) => monitorId);

      if (monitorIds !== undefined || scheduleChanged) {
        await tx.monitor.updateMany({
          where: { id: { in: idsToSync }, organizationId: user.organizationId },
          data: {
            expectedStatusCode: updatedSection.expectedStatusCode,
            frequencySeconds: updatedSection.frequencySeconds,
            timeoutSeconds: updatedSection.timeoutSeconds,
            locations: updatedSection.locations,
            isActive: updatedSection.isActive,
            usesSectionSchedule: true,
            nextCheckAt: updatedSection.isActive ? new Date() : undefined,
          },
        });
      }

      return updatedSection;
    });
    return this.serializeSection(section);
  }

  async remove(id: number, user: AuthenticatedUser) {
    const section = await this.prisma.section.findUnique({ where: { id } });
    if (!section) throw new NotFoundException('Sección no encontrada');
    this.ensureManageAccess(section.organizationId, user);
    await this.prisma.section.delete({ where: { id } });
    return { ok: true };
  }

  async runSectionChecks(id: number, user: AuthenticatedUser) {
    const section = await this.prisma.section.findUnique({
      where: { id },
      include: { monitors: { include: { monitor: true } } },
    });
    if (!section) throw new NotFoundException('Sección no encontrada');
    await this.ensureSectionAccessById(id, user);
    const results: Awaited<ReturnType<typeof this.monitorsService.runCheck>>[] = [];
    for (const item of section.monitors) {
      if (!item.monitor.isActive) continue;
      results.push(await this.monitorsService.runCheck(item.monitorId, user));
    }
    return { checked: results.length, results };
  }

  async updateMembers(id: number, dto: UpdateSectionMembersDto, user: AuthenticatedUser) {
    const section = await this.prisma.section.findUnique({ where: { id } });
    if (!section) throw new NotFoundException('Sección no encontrada');
    this.ensureManageAccess(section.organizationId, user);
    const memberIds = await this.validateUserIds(dto.userIds, user);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.sectionMember.deleteMany({ where: { sectionId: id } });
      if (memberIds.length > 0) {
        await tx.sectionMember.createMany({
          data: memberIds.map((userId) => ({ sectionId: id, userId })),
          skipDuplicates: true,
        });
      }
      return tx.section.findUniqueOrThrow({
        where: { id },
        include: this.sectionInclude,
      });
    });

    return this.serializeSection(updated);
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

  private async validateUserIds(userIds: number[], user: AuthenticatedUser) {
    const uniqueIds = Array.from(new Set(userIds.filter(Number.isInteger)));
    if (uniqueIds.length === 0) return [];
    const count = await this.prisma.user.count({
      where: { id: { in: uniqueIds }, organizationId: user.organizationId, status: 'ACTIVE' },
    });
    if (count !== uniqueIds.length) {
      throw new BadRequestException('Algún usuario no existe o no pertenece a tu organización');
    }
    return uniqueIds;
  }

  private ensureSectionAccess(section: { organizationId: number; members?: { userId: number }[] }, user: AuthenticatedUser) {
    if (section.organizationId !== user.organizationId) {
      throw new ForbiddenException('No tienes acceso a esta sección');
    }
    if (this.canManageSections(user)) return;
    if (section.members?.some((member) => member.userId === user.userId)) return;
    throw new ForbiddenException('No tienes acceso a esta sección');
  }

  private ensureManageAccess(sectionOrganizationId: number, user: AuthenticatedUser) {
    if (sectionOrganizationId !== user.organizationId) {
      throw new ForbiddenException('No tienes acceso a esta sección');
    }
    if (!this.canManageSections(user)) {
      throw new ForbiddenException('No tienes permisos para gestionar esta sección');
    }
  }

  private async ensureSectionAccessById(sectionId: number, user: AuthenticatedUser) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { members: true },
    });
    if (!section) throw new NotFoundException('Sección no encontrada');
    this.ensureSectionAccess(section, user);
  }

  private buildSectionWhere(user: AuthenticatedUser): Prisma.SectionWhereInput {
    return {
      organizationId: user.organizationId,
      ...(this.canManageSections(user) ? {} : { members: { some: { userId: user.userId } } }),
    };
  }

  private canManageSections(user: AuthenticatedUser) {
    return !user.role || user.role === UserRole.OWNER || user.role === UserRole.ADMIN;
  }

  private async buildDefaultMembers(user: AuthenticatedUser) {
    const users = await this.prisma.user.findMany({
      where: { organizationId: user.organizationId, status: 'ACTIVE' },
      select: { id: true },
    });
    return users.map((member) => ({ userId: member.id }));
  }

  private hasScheduleChange(dto: UpdateSectionDto) {
    return (
      dto.expectedStatusCode !== undefined ||
      dto.frequencySeconds !== undefined ||
      dto.timeoutSeconds !== undefined ||
      dto.locations !== undefined ||
      dto.isActive !== undefined
    );
  }

  private sanitizeConfiguredLocations(locations?: string[] | null) {
    const normalized = (locations ?? [])
      .map((location) => location.trim())
      .filter(Boolean);

    return Array.from(new Set(normalized)).slice(0, 10);
  }

  private async applySectionScheduleToMonitors(
    sectionId: number,
    monitorIds: number[],
    section: {
      expectedStatusCode: number;
      frequencySeconds: number;
      timeoutSeconds: number;
      locations: string[];
      isActive: boolean;
    },
  ) {
    if (monitorIds.length === 0) return;
    await this.prisma.monitor.updateMany({
      where: { id: { in: monitorIds }, sections: { some: { sectionId } } },
      data: {
        expectedStatusCode: section.expectedStatusCode,
        frequencySeconds: section.frequencySeconds,
        timeoutSeconds: section.timeoutSeconds,
        locations: section.locations,
        isActive: section.isActive,
        usesSectionSchedule: true,
        nextCheckAt: section.isActive ? new Date() : undefined,
      },
    });
  }

  private get sectionInclude() {
    return {
      members: {
        include: { user: true },
        orderBy: { createdAt: 'asc' },
      },
      monitors: {
        include: { monitor: true },
        orderBy: { assignedAt: 'asc' },
      },
    } satisfies Prisma.SectionInclude;
  }

  private serializeSection(section: SectionWithRelations) {
    const monitors = section.monitors.map((item) => item.monitor);
    return {
      id: String(section.id),
      name: section.name,
      description: section.description ?? '',
      icon: section.icon,
      expectedStatusCode: section.expectedStatusCode,
      frequencySeconds: section.frequencySeconds,
      timeoutSeconds: section.timeoutSeconds,
      locations: section.locations,
      isActive: section.isActive,
      monitorIds: monitors.map((monitor) => monitor.id),
      monitors,
      members: section.members.map(({ user }) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      })),
      memberIds: section.members.map((member) => member.userId),
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
    };
  }
}
