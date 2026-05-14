import { Controller, Get, Param } from '@nestjs/common';
import { StatusService } from './status.service';

@Controller('status')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get('public/:slug')
  getPublicStatus(@Param('slug') slug: string) {
    return this.statusService.getPublicStatus(slug);
  }
}
