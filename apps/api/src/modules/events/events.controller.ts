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
import { interval, map, merge, Observable } from 'rxjs';
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
  ) {}

  @Sse()
  stream(@Query('token') token?: string): Observable<MessageEvent> {
    const user = this.verifyToken(token);
    const events = this.eventsService.streamForOrganization(user.organizationId).pipe(
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

  private verifyToken(token?: string) {
    if (!token) {
      throw new UnauthorizedException('Token requerido');
    }

    const payload = this.jwtService.verify<JwtPayload>(token, {
      secret: this.configService.getOrThrow<string>('auth.jwtSecret'),
    });

    if (!Number.isFinite(payload.organizationId)) {
      throw new ForbiddenException('Token sin organización');
    }

    return payload;
  }
}
