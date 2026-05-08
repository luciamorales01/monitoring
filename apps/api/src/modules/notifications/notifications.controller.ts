import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../../database/prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findRecent(@Req() req: { user: { organizationId: number } }) {
    return this.prisma.notificationEvent.findMany({
      where: {
        monitor: {
          organizationId: req.user.organizationId,
        },
      },
      include: {
        monitor: {
          select: {
            id: true,
            name: true,
            target: true,
          },
        },
        incident: {
          select: {
            id: true,
            status: true,
            severity: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
