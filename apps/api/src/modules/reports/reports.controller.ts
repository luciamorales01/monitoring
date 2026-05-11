import {
  Controller,
  Get,
  Header,
  Query,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

type ReportRange = '24h' | '7d' | '30d' | 'custom';
type ReportFormat = 'csv' | 'pdf' | 'xlsx';

@ApiTags('reports')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Obtener resumen de informes',
    description:
      'Genera un resumen agregado por monitor para un rango temporal.',
  })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['24h', '7d', '30d', 'custom'],
    example: '7d',
    description: 'Rango temporal del informe.',
  })
  @ApiQuery({
    name: 'monitorId',
    required: false,
    example: '12',
    description: 'ID de monitor concreto o `all` para todos.',
  })
  @ApiQuery({
    name: 'sectionId',
    required: false,
    example: '4',
    description: 'ID de seccion concreta o `all` para todas.',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    example: '2026-05-01T00:00:00.000Z',
    description: 'Fecha inicial ISO para rango custom.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    example: '2026-05-10T23:59:59.000Z',
    description: 'Fecha final ISO para rango custom.',
  })
  @ApiOkResponse({
    description: 'Resumen del informe generado.',
    schema: {
      example: {
        range: '7d',
        from: '2026-05-03T10:00:00.000Z',
        to: '2026-05-10T10:00:00.000Z',
        selectedMonitorId: 12,
        totals: {
          averageUptimePercent: 99.92,
          averageResponseTimeMs: 184,
          incidents: 2,
          checks: 5040,
          monitors: 1,
          estimatedDowntimeSeconds: 483,
        },
        rows: [
          {
            monitor: {
              id: 12,
              name: 'Homepage production',
              target: 'https://status.acme.com/health',
              type: 'HTTP',
              currentStatus: 'UP',
              isActive: true,
            },
            uptimePercent: 99.92,
            slaPercent: 99.92,
            averageResponseTimeMs: 184,
            incidents: 2,
            openIncidents: 0,
            checks: 5040,
            downChecks: 4,
            estimatedDowntimeSeconds: 483,
            lastDowntime: '2026-05-08T13:02:00.000Z',
          },
        ],
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Monitor no encontrado para la organizacion actual.',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  summary(
    @Req() req: any,
    @Query('range') range?: ReportRange,
    @Query('monitorId') monitorId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getSummary(
      req.user,
      range ?? '7d',
      this.parseOptionalNumber(monitorId),
      this.parseOptionalNumber(sectionId),
      from,
      to,
    );
  }

  @Get('export')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Exportar informe',
    description: 'Exporta el informe agregado en formato CSV, PDF o XLSX.',
  })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['24h', '7d', '30d', 'custom'],
    example: '30d',
    description: 'Rango temporal del informe.',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'pdf', 'xlsx'],
    example: 'csv',
    description: 'Formato de exportacion.',
  })
  @ApiQuery({
    name: 'monitorId',
    required: false,
    example: 'all',
    description: 'ID de monitor concreto o `all` para todos.',
  })
  @ApiQuery({
    name: 'sectionId',
    required: false,
    example: 'all',
    description: 'ID de seccion concreta o `all` para todas.',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    example: '2026-05-01T00:00:00.000Z',
    description: 'Fecha inicial ISO para rango custom.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    example: '2026-05-10T23:59:59.000Z',
    description: 'Fecha final ISO para rango custom.',
  })
  @ApiProduces(
    'text/csv',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOkResponse({
    description: 'Archivo generado correctamente.',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiNotFoundResponse({
    description: 'Monitor no encontrado para la organizacion actual.',
  })
  async export(
    @Req() req: any,
    @Query('range') range?: ReportRange,
    @Query('format') format?: ReportFormat,
    @Query('monitorId') monitorId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const file = await this.reportsService.exportReport({
      user: req.user,
      range: range ?? '7d',
      format: format ?? 'csv',
      monitorId: this.parseOptionalNumber(monitorId),
      sectionId: this.parseOptionalNumber(sectionId),
      from,
      to,
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
