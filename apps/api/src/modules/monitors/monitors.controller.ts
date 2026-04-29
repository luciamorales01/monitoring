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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMonitorDto } from './create-monitor.dto';
import { MonitorsService } from './monitors.service';
import { UpdateMonitorDto } from './update-monitor.dto';

@UseGuards(JwtAuthGuard)
@Controller('monitors')
export class MonitorsController {
  constructor(private readonly monitorsService: MonitorsService) {}

  @Post()
  create(@Body() dto: CreateMonitorDto, @Req() req: any) {
    return this.monitorsService.create(dto, req.user);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.monitorsService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.monitorsService.findOne(id, req.user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMonitorDto,
    @Req() req: any,
  ) {
    return this.monitorsService.update(id, dto, req.user);
  }

  @Get(':id/checks')
  findRecentChecks(
    @Param('id', ParseIntPipe) id: number,
    @Query('order') order: 'asc' | 'desc' | undefined,
    @Req() req: any,
  ) {
    return this.monitorsService.findRecentChecks(id, req.user, order);
  }

  @Post(':id/run-check')
  runCheck(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.monitorsService.runCheck(id, req.user);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.monitorsService.toggleActive(id, req.user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.monitorsService.remove(id, req.user);
  }
}
