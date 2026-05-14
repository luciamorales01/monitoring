import {
  Controller,
  ForbiddenException,
  Query,
  Sse,
  UnauthorizedException,
} from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import { interval, map, merge, Observable } from 'rxjs';
import { PrismaService } from '../../database/prisma/prisma.service';
import { EventsService } from './events.service';

type JwtPayload = {
  organizationId: number;
  sub: number;
};

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Sse()
  async stream(
    @Query('token') token?: string,
  ): Promise<Observable<MessageEvent>> {
    const user = await this.verifyToken(token);
    const events = this.eventsService
      .streamForOrganization(user.organizationId)
      .pipe(
        map((event) => ({
          data: event.payload,
          type: event.name,
        })),
      );
    const heartbeat = interval(30_000).pipe(
      map(() => ({
        data: { timestamp: new Date().toISOString() },
        type: 'heartbeat',
      })),
    );

    return merge(events, heartbeat);
  }

  private async verifyToken(token?: string) {
    if (!token) {
      throw new UnauthorizedException('Token requerido');
    }

    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('auth.jwtSecret'),
      });
    } catch {
      throw new UnauthorizedException('Token invalido');
    }

    if (
      !Number.isInteger(payload.sub) ||
      !Number.isInteger(payload.organizationId)
    ) {
      throw new ForbiddenException('Token sin organizacion');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        organizationId: payload.organizationId,
        status: UserStatus.ACTIVE,
      },
      select: { id: true, organizationId: true },
    });

    if (!user) {
      throw new UnauthorizedException('Token invalido o usuario inactivo');
    }

    return user;
  }
}
