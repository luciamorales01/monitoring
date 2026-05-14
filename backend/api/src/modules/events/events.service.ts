import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';
import { filter, Observable, share } from 'rxjs';
import {
  MONITORING_EVENTS_CHANNEL,
  type MonitoringEvent,
} from './events.types';

@Injectable()
export class EventsService implements OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private publisher?: IORedis;
  private subscriber?: IORedis;
  private events$?: Observable<MonitoringEvent>;

  constructor(private readonly configService: ConfigService) {}

  async publish(event: MonitoringEvent) {
    try {
      const publisher = this.getPublisher();
      await publisher.publish(MONITORING_EVENTS_CHANNEL, JSON.stringify(event));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.warn(`No se pudo publicar evento SSE ${event.name}: ${message}`);
    }
  }

  streamForOrganization(organizationId: number) {
    return this.getEventStream().pipe(
      filter((event) => event.payload.organizationId === organizationId),
    );
  }

  async onModuleDestroy() {
    await Promise.all([
      this.publisher?.quit().catch(() => undefined),
      this.subscriber?.quit().catch(() => undefined),
    ]);
  }

  private getEventStream() {
    if (!this.events$) {
      this.events$ = new Observable<MonitoringEvent>((subscriber) => {
        const redis = this.getSubscriber();
        const handleMessage = (channel: string, message: string) => {
          if (channel !== MONITORING_EVENTS_CHANNEL) return;
          const event = this.parseMessage(message);
          if (event) subscriber.next(event);
        };

        redis.on('message', handleMessage);
        void redis.subscribe(MONITORING_EVENTS_CHANNEL);

        return () => {
          redis.off('message', handleMessage);
          void redis.unsubscribe(MONITORING_EVENTS_CHANNEL);
        };
      }).pipe(share());
    }

    return this.events$;
  }

  private parseMessage(message: string) {
    try {
      return JSON.parse(message) as MonitoringEvent;
    } catch {
      this.logger.warn('Evento SSE descartado por JSON inválido');
      return null;
    }
  }

  private getPublisher() {
    this.publisher ??= this.createRedisClient();
    return this.publisher;
  }

  private getSubscriber() {
    this.subscriber ??= this.createRedisClient();
    return this.subscriber;
  }

  private createRedisClient() {
    const redisUrl = this.configService.get<string>('queue.redisUrl');

    if (redisUrl) {
      return new IORedis(redisUrl, { maxRetriesPerRequest: null });
    }

    return new IORedis({
      host: this.configService.get<string>('queue.redisHost') ?? '127.0.0.1',
      maxRetriesPerRequest: null,
      port: this.configService.get<number>('queue.redisPort') ?? 6379,
    });
  }
}
