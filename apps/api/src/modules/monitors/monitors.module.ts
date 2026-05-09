import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MonitorsController } from './monitors.controller';
import { MonitorSchedulerService } from './monitor-scheduler.service';
import { MonitorsService } from './monitors.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [MonitorsController],
  providers: [MonitorsService, MonitorSchedulerService],
  exports: [MonitorsService],
})
export class MonitorsModule {}
