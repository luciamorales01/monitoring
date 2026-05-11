import { Body, Controller, Get, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { buildAccessibleNotificationWhere, type AuthenticatedUser } from '../../common/monitor-access-scope';
import { PrismaService } from '../../database/prisma/prisma.service';

const notificationInclude = {
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
};

type AuthRequest = { user: AuthenticatedUser };

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findRecent(
    @Req() req: AuthRequest,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const take = Math.min(Math.max(Number(limit) || 50, 1), 100);

    return this.prisma.notificationEvent.findMany({
      where: {
        ...(unreadOnly === 'true' ? { readAt: null } : {}),
        ...buildAccessibleNotificationWhere(req.user),
      },
      include: notificationInclude,
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  @Get('unread-count')
  async unreadCount(@Req() req: AuthRequest) {
    const count = await this.prisma.notificationEvent.count({
      where: {
        readAt: null,
        ...buildAccessibleNotificationWhere(req.user),
      },
    });

    return { count };
  }

  @Patch('read')
  async markSelectedAsRead(
    @Req() req: AuthRequest,
    @Body() body: { ids?: number[] },
  ) {
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id) => Number.isInteger(id))
      : [];

    if (ids.length === 0) {
      return { updated: 0 };
    }

    const result = await this.prisma.notificationEvent.updateMany({
      where: {
        id: { in: ids },
        ...buildAccessibleNotificationWhere(req.user),
      },
      data: { readAt: new Date() },
    });

    return { updated: result.count };
  }

  @Post('read-all')
  async markAllAsRead(@Req() req: AuthRequest) {
    const result = await this.prisma.notificationEvent.updateMany({
      where: {
        readAt: null,
        ...buildAccessibleNotificationWhere(req.user),
      },
      data: { readAt: new Date() },
    });

    return { updated: result.count };
  }
}
