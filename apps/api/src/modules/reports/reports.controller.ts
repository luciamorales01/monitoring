import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

type ReportRange = '24h' | '7d' | '30d';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  summary(@Req() req: any, @Query('range') range?: ReportRange) {
    return this.reportsService.getSummary(req.user, range ?? '7d');
  }
}
