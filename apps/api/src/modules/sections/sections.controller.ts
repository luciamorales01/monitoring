import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSectionDto } from './create-section.dto';
import { SectionsService } from './sections.service';
import { UpdateSectionDto } from './update-section.dto';

@UseGuards(JwtAuthGuard)
@Controller('sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Get()
  findAll(@Req() req: any) { return this.sectionsService.findAll(req.user); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) { return this.sectionsService.findOne(id, req.user); }

  @Post()
  create(@Body() dto: CreateSectionDto, @Req() req: any) { return this.sectionsService.create(dto, req.user); }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSectionDto, @Req() req: any) { return this.sectionsService.update(id, dto, req.user); }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) { return this.sectionsService.remove(id, req.user); }

  @Post(':id/run-checks')
  runSectionChecks(@Param('id', ParseIntPipe) id: number, @Req() req: any) { return this.sectionsService.runSectionChecks(id, req.user); }
}
