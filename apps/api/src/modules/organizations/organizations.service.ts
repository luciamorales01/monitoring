import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

type AuthenticatedUser = {
  organizationId: number;
};

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser) {
    const organizations = await this.prisma.organization.findMany({
      where: {
        id: user.organizationId,
      },
      include: {
        _count: {
          select: {
            monitors: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
      monitorCount: organization._count.monitors,
    }));
  }
}
