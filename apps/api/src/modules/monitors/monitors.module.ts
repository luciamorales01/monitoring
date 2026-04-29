import { Module } from '@nestjs/common';
import { MonitorsController } from './monitors.controller';
import { MonitorSchedulerService } from './monitor-scheduler.service';
import { MonitorsService } from './monitors.service';

@Module({
  controllers: [MonitorsController],
  providers: [MonitorsService, MonitorSchedulerService],
})
export class MonitorsModule {}
