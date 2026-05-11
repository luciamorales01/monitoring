import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMonitorDto } from './create-monitor.dto';
import { ListMonitorsQueryDto } from './list-monitors-query.dto';
import { MonitorsService } from './monitors.service';
import { UpdateMonitorDto } from './update-monitor.dto';

type AuthenticatedRequest = {
  user: {
    organizationId: number;
    userId: number;
    role?: string;
  };
};

@ApiTags('monitors')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('monitors')
export class MonitorsController {
  constructor(private readonly monitorsService: MonitorsService) {}

  @Post()
  @Roles('OWNER')
  @ApiOperation({
    summary: 'Crear monitor',
    description:
      'Crea un monitor dentro de la organizacion del usuario autenticado.',
  })
  @ApiBody({ type: CreateMonitorDto })
  @ApiCreatedResponse({
    description: 'Monitor creado.',
    schema: {
      example: {
        id: 12,
        name: 'Homepage production',
        type: 'HTTP',
        target: 'https://status.acme.com/health',
        expectedStatusCode: 200,
        frequencySeconds: 60,
        timeoutSeconds: 10,
        currentStatus: 'UNKNOWN',
        isActive: true,
        organizationId: 1,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description: 'Rol insuficiente para crear monitores.',
  })
  create(@Body() dto: CreateMonitorDto, @Req() req: AuthenticatedRequest) {
    return this.monitorsService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar monitores',
    description:
      'Devuelve el listado paginado de monitores visibles para la organizacion actual.',
  })
  @ApiOkResponse({
    description: 'Listado paginado de monitores.',
    schema: {
      example: {
        items: [
          {
            id: 12,
            name: 'Homepage production',
            type: 'HTTP',
            target: 'https://status.acme.com/health',
            currentStatus: 'UP',
            isActive: true,
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    },
  })
  findAll(@Query() query: ListMonitorsQueryDto, @Req() req: AuthenticatedRequest) {
    return this.monitorsService.findAll(req.user, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener monitor',
    description: 'Recupera el detalle de un monitor y sus ultimos chequeos.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 12,
    description: 'ID del monitor.',
  })
  @ApiOkResponse({
    description: 'Detalle del monitor.',
    schema: {
      example: {
        id: 12,
        name: 'Homepage production',
        type: 'HTTP',
        target: 'https://status.acme.com/health',
        currentStatus: 'UP',
        checkResults: [
          {
            id: 401,
            status: 'UP',
            responseTimeMs: 182,
            checkedAt: '2026-05-10T09:00:00.000Z',
          },
        ],
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Monitor no encontrado.' })
  @ApiForbiddenResponse({ description: 'Sin acceso al monitor solicitado.' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.monitorsService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Actualizar monitor',
    description: 'Actualiza la configuracion de un monitor existente.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 12,
    description: 'ID del monitor.',
  })
  @ApiBody({ type: UpdateMonitorDto })
  @ApiOkResponse({
    description: 'Monitor actualizado.',
    schema: {
      example: {
        id: 12,
        name: 'Homepage production EU',
        frequencySeconds: 120,
        timeoutSeconds: 15,
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Rol insuficiente o monitor fuera de la organizacion.',
  })
  @ApiNotFoundResponse({ description: 'Monitor no encontrado.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMonitorDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.monitorsService.update(id, dto, req.user);
  }

  @Patch(':id/use-section-schedule')
  @Roles('OWNER', 'ADMIN')
  useSectionSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.monitorsService.useSectionSchedule(id, req.user);
  }

  @Get(':id/checks')
  @ApiOperation({
    summary: 'Obtener chequeos recientes',
    description: 'Devuelve hasta 50 resultados recientes del monitor indicado.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 12,
    description: 'ID del monitor.',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
    description: 'Orden cronologico de los resultados.',
  })
  @ApiOkResponse({
    description: 'Chequeos recientes del monitor.',
    schema: {
      example: [
        {
          id: 401,
          monitorId: 12,
          status: 'UP',
          responseTimeMs: 182,
          checkedAt: '2026-05-10T09:00:00.000Z',
          location: 'eu-west-1',
        },
      ],
    },
  })
  @ApiNotFoundResponse({ description: 'Monitor no encontrado.' })
  findRecentChecks(
    @Param('id', ParseIntPipe) id: number,
    @Query('order') order: 'asc' | 'desc' | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.monitorsService.findRecentChecks(id, req.user, order);
  }

  @Post(':id/run-check')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Ejecutar chequeo manual',
    description:
      'Lanza una comprobacion inmediata del monitor y persiste resultados.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 12,
    description: 'ID del monitor.',
  })
  @ApiOkResponse({
    description: 'Chequeo manual ejecutado.',
    schema: {
      example: {
        overallStatus: 'UP',
        checkedAt: '2026-05-10T09:05:00.000Z',
        previousStatus: 'UNKNOWN',
        incidentSync: null,
        results: [
          {
            checkedAt: '2026-05-10T09:05:00.000Z',
            errorMessage: null,
            location: 'eu-west-1',
            responseTimeMs: 178,
            status: 'UP',
            statusCode: 200,
          },
        ],
      },
    },
  })
  runCheck(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.monitorsService.runCheck(id, req.user);
  }

  @Post(':id/check')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Alias de chequeo manual',
    description:
      'Alias compatible para ejecutar un chequeo inmediato del monitor.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 12,
    description: 'ID del monitor.',
  })
  @ApiOkResponse({
    description: 'Chequeo manual ejecutado.',
    schema: {
      example: {
        overallStatus: 'UP',
        checkedAt: '2026-05-10T09:05:00.000Z',
        previousStatus: 'UNKNOWN',
        incidentSync: null,
        results: [],
      },
    },
  })
  runCheckAlias(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.monitorsService.runCheck(id, req.user);
  }

  @Patch(':id/toggle-active')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Activar o pausar monitor',
    description: 'Alterna el estado activo del monitor.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 12,
    description: 'ID del monitor.',
  })
  @ApiOkResponse({
    description: 'Estado del monitor actualizado.',
    schema: {
      example: {
        id: 12,
        isActive: false,
        nextCheckAt: null,
      },
    },
  })
  toggleActive(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.monitorsService.toggleActive(id, req.user);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Eliminar monitor',
    description: 'Elimina un monitor de la organizacion actual.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 12,
    description: 'ID del monitor.',
  })
  @ApiOkResponse({
    description: 'Monitor eliminado.',
    schema: {
      example: {
        id: 12,
        name: 'Homepage production',
        type: 'HTTP',
        target: 'https://status.acme.com/health',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Monitor no encontrado.' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.monitorsService.remove(id, req.user);
  }
}
