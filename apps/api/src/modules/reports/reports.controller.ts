import { Controller, Get, Header, Query, Req, StreamableFile, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

type ReportRange = '24h' | '7d' | '30d';
type ReportFormat = 'csv' | 'pdf' | 'xlsx';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  summary(
    @Req() req: any,
    @Query('range') range?: ReportRange,
    @Query('monitorId') monitorId?: string,
  ) {
    return this.reportsService.getSummary(req.user, range ?? '7d', this.parseOptionalNumber(monitorId));
  }

  @Get('export')
  @Header('Cache-Control', 'no-store')
  async export(
    @Req() req: any,
    @Query('range') range?: ReportRange,
    @Query('format') format?: ReportFormat,
    @Query('monitorId') monitorId?: string,
  ) {
    const file = await this.reportsService.exportReport({
      user: req.user,
      range: range ?? '7d',
      format: format ?? 'csv',
      monitorId: this.parseOptionalNumber(monitorId),
    });

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  private parseOptionalNumber(value?: string) {
    if (!value || value === 'all') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
