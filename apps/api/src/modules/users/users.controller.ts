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
import { CreateInvitationDto } from './create-invitation.dto';
import { UpdateUserStatusDto } from './update-user-status.dto';
import { UpdateUserDto } from './update-user.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('OWNER', 'ADMIN')
  findAll(@Req() req: any) {
    return this.usersService.findAll(req.user);
  }

  @Get('invitations')
  @Roles('OWNER', 'ADMIN')
  listInvitations(@Req() req: any) {
    return this.usersService.listInvitations(req.user);
  }

  @Post('invitations')
  @Roles('OWNER', 'ADMIN')
  createInvitation(@Body() dto: CreateInvitationDto, @Req() req: any) {
    return this.usersService.createInvitation(dto, req.user);
  }

  @Delete('invitations/:id')
  @Roles('OWNER', 'ADMIN')
  revokeInvitation(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.usersService.revokeInvitation(id, req.user);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Req() req: any,
  ) {
    return this.usersService.update(id, dto, req.user);
  }

  @Patch(':id/status')
  @Roles('OWNER', 'ADMIN')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: any,
  ) {
    return this.usersService.updateStatus(id, dto, req.user);
  }
}
