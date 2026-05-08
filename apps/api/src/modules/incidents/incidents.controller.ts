import { Body, Controller, Get, Param, ParseIntPipe, Patch, Req, UseGuards } from '@nestjs/common';
import { IncidentSeverity } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IncidentsService } from './incidents.service';
import { UpdateIncidentDto } from './update-incident.dto';

@UseGuards(JwtAuthGuard)
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.incidentsService.findAll(req.user);
  }

  @Get('active')
  findActive(@Req() req: any) {
    return this.incidentsService.findActive(req.user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.incidentsService.findOne(id, req.user);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateIncidentDto, @Req() req: any) {
    return this.incidentsService.update(id, dto, req.user);
  }

  @Patch(':id/acknowledge')
  acknowledge(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.incidentsService.acknowledge(id, req.user);
  }

  @Patch(':id/resolve')
  resolve(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateIncidentDto, @Req() req: any) {
    return this.incidentsService.resolve(id, dto, req.user);
  }

  @Patch(':id/severity')
  updateSeverity(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { severity: IncidentSeverity },
    @Req() req: any,
  ) {
    return this.incidentsService.updateSeverity(id, dto.severity, req.user);
  }
}
