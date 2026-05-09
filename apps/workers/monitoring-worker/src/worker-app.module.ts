import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import databaseConfig from '../../../api/src/config/database.config';
import queueConfig from '../../../api/src/config/queue.config';
import { PrismaModule } from '../../../api/src/database/prisma/prisma.module';
import { EventsModule } from '../../../api/src/modules/events/events.module';
import { NotificationsService } from '../../../api/src/modules/notifications/notifications.service';
import { MonitorsService } from '../../../api/src/modules/monitors/monitors.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, queueConfig],
    }),
    PrismaModule,
    EventsModule,
  ],
  providers: [NotificationsService, MonitorsService],
})
export class MonitoringWorkerAppModule {}
