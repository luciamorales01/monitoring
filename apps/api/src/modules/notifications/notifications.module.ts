import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsQueueService } from './notifications-queue.service';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsQueueService, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
