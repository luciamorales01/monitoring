import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Obtener resumen del dashboard',
    description:
      'Devuelve KPIs operativos y chequeos recientes de la organizacion actual.',
  })
  @ApiOkResponse({
    description: 'Resumen principal del dashboard.',
    schema: {
      example: {
        totalMonitors: 14,
        activeMonitors: 12,
        onlineMonitors: 11,
        downMonitors: 1,
        pausedMonitors: 2,
        openIncidents: 1,
        uptimePercent: 99.81,
        averageResponseTimeMs: 178,
        recentChecks: [
          {
            status: 'UP',
            responseTimeMs: 176,
            checkedAt: '2026-05-10T09:55:00.000Z',
            monitor: {
              id: 12,
              name: 'Homepage production',
              target: 'https://status.acme.com/health',
            },
          },
        ],
        generatedAt: '2026-05-10T10:00:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  summary(@Req() req: any) {
    return this.dashboardService.getSummary(req.user);
  }
}
