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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IncidentsService } from './incidents.service';

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
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { status?: 'OPEN' | 'RESOLVED' },
    @Req() req: any,
  ) {
    return this.incidentsService.update(id, dto, req.user);
  }
}
