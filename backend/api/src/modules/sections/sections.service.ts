import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { MonitorsService } from '../monitors/monitors.service';
import { CreateSectionDto } from './create-section.dto';
import { UpdateSectionDto } from './update-section.dto';
import { UpdateSectionMembersDto } from './update-section-members.dto';

type AuthenticatedUser = {
  organizationId: number;
  userId: number;
  role?: string;
};

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
    const monitorIds = await this.validateMonitorIds(
      dto.monitorIds ?? [],
      user,
    );
    const defaultMembers = this.buildDefaultMembers(user);
    const section = await this.prisma.section.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() ?? '',
        icon: dto.icon ?? 'folder',
        expectedStatusCode: dto.expectedStatusCode ?? 200,
        frequencySeconds: dto.frequencySeconds ?? 60,
        timeoutSeconds: dto.timeoutSeconds ?? 10,
        isActive: dto.isActive ?? true,
        organizationId: user.organizationId,
        ...(monitorIds.length > 0
          ? {
              monitors: {
                create: monitorIds.map((monitorId) => ({ monitorId })),
              },
            }
          : {}),
        ...(defaultMembers.length > 0
          ? { members: { create: defaultMembers } }
          : {}),
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
    this.ensureManageAccess(current, user);
    const monitorIds =
      dto.monitorIds === undefined
        ? undefined
        : await this.validateMonitorIds(dto.monitorIds, user);
    const scheduleChanged = this.hasScheduleChange(dto);
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
          ...(dto.description !== undefined
            ? { description: dto.description.trim() }
            : {}),
          ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
          ...(dto.expectedStatusCode !== undefined
            ? { expectedStatusCode: dto.expectedStatusCode }
            : {}),
          ...(dto.frequencySeconds !== undefined
            ? { frequencySeconds: dto.frequencySeconds }
            : {}),
          ...(dto.timeoutSeconds !== undefined
            ? { timeoutSeconds: dto.timeoutSeconds }
            : {}),
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
    const section = await this.prisma.section.findUnique({
      where: { id },
      include: this.sectionInclude,
    });
    if (!section) throw new NotFoundException('Sección no encontrada');
    this.ensureManageAccess(section, user);
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
    const results: Awaited<ReturnType<typeof this.monitorsService.runCheck>>[] =
      [];
    for (const item of section.monitors) {
      if (!item.monitor.isActive) continue;
      results.push(await this.monitorsService.runCheck(item.monitorId, user));
    }
    return { checked: results.length, results };
  }

  async updateMembers(
    id: number,
    dto: UpdateSectionMembersDto,
    user: AuthenticatedUser,
  ) {
    const section = await this.prisma.section.findUnique({
      where: { id },
      include: { members: true },
    });
    if (!section) throw new NotFoundException('Sección no encontrada');
    this.ensureManageAccess(section, user);
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

  private async validateMonitorIds(
    monitorIds: number[],
    user: AuthenticatedUser,
  ) {
    const uniqueIds = Array.from(new Set(monitorIds.filter(Number.isInteger)));
    if (uniqueIds.length === 0) return [];
    const monitors = await this.prisma.monitor.findMany({
      where: { id: { in: uniqueIds }, organizationId: user.organizationId },
      include: {
        sections: {
          include: {
            section: {
              include: { members: true },
            },
          },
        },
      },
    });
    if (monitors.length !== uniqueIds.length) {
      throw new BadRequestException(
        'Algún monitor no existe o no pertenece a tu organización',
      );
    }
    const inaccessibleMonitor = monitors.find(
      (monitor) => !this.canAccessMonitor(monitor, user),
    );
    if (inaccessibleMonitor) {
      throw new ForbiddenException(
        'No puedes vincular monitores fuera de tus secciones o sin sección asignada.',
      );
    }
    return uniqueIds;
  }

  private async validateUserIds(userIds: number[], user: AuthenticatedUser) {
    const uniqueIds = Array.from(new Set(userIds.filter(Number.isInteger)));
    if (uniqueIds.length === 0) return [];
    const count = await this.prisma.user.count({
      where: {
        id: { in: uniqueIds },
        organizationId: user.organizationId,
        status: 'ACTIVE',
      },
    });
    if (count !== uniqueIds.length) {
      throw new BadRequestException(
        'Algún usuario no existe o no pertenece a tu organización',
      );
    }
    return uniqueIds;
  }

  private ensureSectionAccess(
    section: { organizationId: number; members?: { userId: number }[] },
    user: AuthenticatedUser,
  ) {
    if (section.organizationId !== user.organizationId) {
      throw new ForbiddenException('No tienes acceso a esta sección');
    }
    if (this.canAccessAllSections(user)) return;
    if (this.isSectionMember(section, user.userId)) return;
    throw new ForbiddenException('No tienes acceso a esta sección');
  }

  private ensureManageAccess(
    section: { organizationId: number; members?: { userId: number }[] },
    user: AuthenticatedUser,
  ) {
    if (section.organizationId !== user.organizationId) {
      throw new ForbiddenException('No tienes acceso a esta sección');
    }
    if (this.canAccessAllSections(user)) return;
    if (
      user.role === UserRole.ADMIN &&
      this.isSectionMember(section, user.userId)
    )
      return;
    if (user.role === UserRole.VIEWER) {
      throw new ForbiddenException(
        'Los usuarios VIEWER solo tienen acceso de lectura a sus secciones.',
      );
    }
    throw new ForbiddenException(
      'Solo puedes gestionar secciones de las que eres miembro.',
    );
  }

  private ensureOwnerAccess(
    sectionOrganizationId: number,
    user: AuthenticatedUser,
  ) {
    if (sectionOrganizationId !== user.organizationId) {
      throw new ForbiddenException('No tienes acceso a esta sección');
    }
    if (user.role !== UserRole.OWNER) {
      throw new ForbiddenException(
        'Solo un propietario puede gestionar los miembros de la sección.',
      );
    }
  }

  private async ensureSectionAccessById(
    sectionId: number,
    user: AuthenticatedUser,
  ) {
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
      ...(this.canAccessAllSections(user)
        ? {}
        : { members: { some: { userId: user.userId } } }),
    };
  }

  private canAccessAllSections(user: AuthenticatedUser) {
    return !user.role || user.role === UserRole.OWNER;
  }

  private buildDefaultMembers(user: AuthenticatedUser) {
    if (user.role === UserRole.ADMIN) {
      return [{ userId: user.userId }];
    }

    return [];
  }

  private isSectionMember(
    section: { members?: { userId: number }[] },
    userId: number,
  ) {
    return section.members?.some((member) => member.userId === userId) ?? false;
  }

  private canAccessMonitor(
    monitor: {
      sections?: {
        section: {
          members?: { userId: number }[];
        };
      }[];
    },
    user: AuthenticatedUser,
  ) {
    if (this.canAccessAllSections(user)) return true;
    return (
      monitor.sections?.some(({ section }) =>
        this.isSectionMember(section, user.userId),
      ) ?? false
    );
  }

  private hasScheduleChange(dto: UpdateSectionDto) {
    return (
      dto.expectedStatusCode !== undefined ||
      dto.frequencySeconds !== undefined ||
      dto.timeoutSeconds !== undefined ||
      dto.isActive !== undefined
    );
  }

  private async applySectionScheduleToMonitors(
    sectionId: number,
    monitorIds: number[],
    section: {
      expectedStatusCode: number;
      frequencySeconds: number;
      timeoutSeconds: number;
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
