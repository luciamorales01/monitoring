import { Module } from '@nestjs/common';
import { MonitorsModule } from '../monitors/monitors.module';
import { SectionsController } from './sections.controller';
import { SectionsService } from './sections.service';

@Module({
  imports: [MonitorsModule],
  controllers: [SectionsController],
  providers: [SectionsService],
})
export class SectionsModule {}
