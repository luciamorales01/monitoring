import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import databaseConfig from '../../../api/src/config/database.config';
import queueConfig from '../../../api/src/config/queue.config';
import { PrismaModule } from '../../../api/src/database/prisma/prisma.module';
import { EventsModule } from '../../../api/src/modules/events/events.module';
import { NotificationsService } from '../../../api/src/modules/notifications/notifications.service';
import { MonitorsService } from '../../../api/src/modules/monitors/monitors.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        resolve(process.cwd(), '..', '..', '.env'),
        resolve(process.cwd(), '.env'),
      ],
      isGlobal: true,
      load: [databaseConfig, queueConfig],
    }),
    PrismaModule,
    EventsModule,
  ],
  providers: [NotificationsService, MonitorsService],
})
export class MonitoringWorkerAppModule {}
