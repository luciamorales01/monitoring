import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MonitorsController } from './monitors.controller';
import { MonitorCheckRunnerService } from './monitor-check-runner.service';
import { MonitorChecksQueueService } from './monitor-checks-queue.service';
import { MonitorIncidentSyncService } from './monitor-incident-sync.service';
import { MonitorSchedulerService } from './monitor-scheduler.service';
import { MonitorTargetValidatorService } from './monitor-target-validator.service';
import { MonitorsService } from './monitors.service';

@Module({
  imports: [PrismaModule, NotificationsModule, EventsModule],
  controllers: [MonitorsController],
  providers: [
    MonitorsService,
    MonitorTargetValidatorService,
    MonitorCheckRunnerService,
    MonitorIncidentSyncService,
    MonitorSchedulerService,
    MonitorChecksQueueService,
  ],
  exports: [MonitorsService],
})
export class MonitorsModule {}
