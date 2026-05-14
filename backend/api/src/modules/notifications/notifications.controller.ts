import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  buildAccessibleNotificationWhere,
  type AuthenticatedUser,
} from '../../common/monitor-access-scope';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  ListNotificationsQueryDto,
  MarkNotificationsReadDto,
} from './notifications.dto';

const notificationSelect = {
  id: true,
  monitorId: true,
  incidentId: true,
  type: true,
  channel: true,
  status: true,
  sentAt: true,
  readAt: true,
  createdAt: true,
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
    @Query() query: ListNotificationsQueryDto,
  ) {
    const take = query.limit ?? 50;

    return this.prisma.notificationEvent.findMany({
      where: {
        ...(query.unreadOnly ? { readAt: null } : {}),
        ...buildAccessibleNotificationWhere(req.user),
      },
      select: notificationSelect,
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
    @Body() dto: MarkNotificationsReadDto,
  ) {
    const ids = Array.from(new Set(dto.ids));

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
