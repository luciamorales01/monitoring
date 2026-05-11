import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSectionDto } from './create-section.dto';
import { SectionsService } from './sections.service';
import { UpdateSectionDto } from './update-section.dto';
import { UpdateSectionMembersDto } from './update-section-members.dto';

type AuthenticatedRequest = {
  user: {
    organizationId: number;
    userId: number;
    role?: string;
  };
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.sectionsService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.sectionsService.findOne(id, req.user);
  }

  @Post()
  @Roles('OWNER', 'ADMIN')
  create(@Body() dto: CreateSectionDto, @Req() req: AuthenticatedRequest) {
    return this.sectionsService.create(dto, req.user);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSectionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sectionsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.sectionsService.remove(id, req.user);
  }

  @Post(':id/run-checks')
  @Roles('OWNER', 'ADMIN')
  runSectionChecks(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.sectionsService.runSectionChecks(id, req.user);
  }

  @Patch(':id/members')
  @Roles('OWNER')
  updateMembers(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSectionMembersDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sectionsService.updateMembers(id, dto, req.user);
  }
}
