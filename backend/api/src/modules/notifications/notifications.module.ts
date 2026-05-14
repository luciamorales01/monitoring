import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import queueConfig from '../../config/queue.config';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsQueueService } from './notifications-queue.service';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [ConfigModule.forFeature(queueConfig), PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsQueueService, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
