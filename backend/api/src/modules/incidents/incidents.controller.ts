import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IncidentsService } from './incidents.service';
import { UpdateIncidentDto } from './update-incident.dto';
import { UpdateIncidentSeverityDto } from './update-incident-severity.dto';

@ApiTags('incidents')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar incidencias',
    description:
      'Devuelve todas las incidencias de la organizacion ordenadas por fecha de inicio.',
  })
  @ApiOkResponse({
    description: 'Listado de incidencias.',
    schema: {
      example: [
        {
          id: 33,
          status: 'OPEN',
          severity: 'HIGH',
          startedAt: '2026-05-10T08:00:00.000Z',
          monitor: {
            id: 12,
            name: 'Homepage production',
            target: 'https://status.acme.com/health',
          },
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  findAll(@Req() req: AuthenticatedRequest) {
    return this.incidentsService.findAll(req.user);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Listar incidencias activas',
    description:
      'Devuelve incidencias abiertas o reconocidas ordenadas por severidad y fecha.',
  })
  @ApiOkResponse({
    description: 'Listado de incidencias activas.',
    schema: {
      example: [
        {
          id: 33,
          status: 'OPEN',
          severity: 'HIGH',
          startedAt: '2026-05-10T08:00:00.000Z',
          monitor: {
            id: 12,
            name: 'Homepage production',
            target: 'https://status.acme.com/health',
          },
        },
      ],
    },
  })
  findActive(@Req() req: AuthenticatedRequest) {
    return this.incidentsService.findActive(req.user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener incidencia',
    description: 'Recupera el detalle de una incidencia concreta.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 33,
    description: 'ID de la incidencia.',
  })
  @ApiOkResponse({
    description: 'Detalle de la incidencia.',
    schema: {
      example: {
        id: 33,
        status: 'ACKNOWLEDGED',
        severity: 'HIGH',
        startedAt: '2026-05-10T08:00:00.000Z',
        acknowledgedAt: '2026-05-10T08:05:00.000Z',
        resolutionNote: null,
        rootCause: null,
        monitor: {
          id: 12,
          name: 'Homepage production',
          target: 'https://status.acme.com/health',
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Incidencia no encontrada.' })
  @ApiForbiddenResponse({
    description: 'Sin acceso a la incidencia solicitada.',
  })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.incidentsService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Actualizar incidencia',
    description: 'Actualiza estado, severidad o notas de una incidencia.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 33,
    description: 'ID de la incidencia.',
  })
  @ApiBody({ type: UpdateIncidentDto })
  @ApiOkResponse({
    description: 'Incidencia actualizada.',
    schema: {
      example: {
        id: 33,
        status: 'ACKNOWLEDGED',
        severity: 'MEDIUM',
        rootCause: 'Despliegue defectuoso',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Rol insuficiente o incidencia fuera de la organizacion.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIncidentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.incidentsService.update(id, dto, req.user);
  }

  @Patch(':id/acknowledge')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Reconocer incidencia',
    description:
      'Marca la incidencia como reconocida por un usuario autorizado.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 33,
    description: 'ID de la incidencia.',
  })
  @ApiOkResponse({
    description: 'Incidencia reconocida.',
    schema: {
      example: {
        id: 33,
        status: 'ACKNOWLEDGED',
        acknowledgedAt: '2026-05-10T08:05:00.000Z',
      },
    },
  })
  acknowledge(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.incidentsService.acknowledge(id, req.user);
  }

  @Patch(':id/resolve')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Resolver incidencia',
    description: 'Marca una incidencia como resuelta y registra notas finales.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 33,
    description: 'ID de la incidencia.',
  })
  @ApiBody({ type: UpdateIncidentDto })
  @ApiOkResponse({
    description: 'Incidencia resuelta.',
    schema: {
      example: {
        id: 33,
        status: 'RESOLVED',
        resolvedAt: '2026-05-10T08:15:00.000Z',
        resolutionNote: 'Rollback aplicado y verificado.',
        rootCause: 'Despliegue defectuoso',
      },
    },
  })
  resolve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIncidentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.incidentsService.resolve(id, dto, req.user);
  }

  @Patch(':id/severity')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Actualizar severidad',
    description: 'Reasigna la severidad de una incidencia existente.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 33,
    description: 'ID de la incidencia.',
  })
  @ApiBody({ type: UpdateIncidentSeverityDto })
  @ApiOkResponse({
    description: 'Severidad actualizada.',
    schema: {
      example: {
        id: 33,
        severity: 'CRITICAL',
        lastStatusChangeAt: '2026-05-10T08:10:00.000Z',
      },
    },
  })
  updateSeverity(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIncidentSeverityDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.incidentsService.updateSeverity(id, dto.severity, req.user);
  }
}
