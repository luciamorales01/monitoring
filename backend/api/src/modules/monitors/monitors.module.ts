import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MonitorsController } from './monitors.controller';
import { MonitorChecksQueueService } from './monitor-checks-queue.service';
import { MonitorSchedulerService } from './monitor-scheduler.service';
import { MonitorsService } from './monitors.service';

@Module({
  imports: [PrismaModule, NotificationsModule, EventsModule],
  controllers: [MonitorsController],
  providers: [
    MonitorsService,
    MonitorSchedulerService,
    MonitorChecksQueueService,
  ],
  exports: [MonitorsService],
})
export class MonitorsModule {}
