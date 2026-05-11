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
import { UpdateCurrentUserDto } from './update-current-user.dto';
import { UpdateUserStatusDto } from './update-user-status.dto';
import { UpdateUserDto } from './update-user.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getCurrentUser(@Req() req: any) {
    return this.usersService.getCurrentUser(req.user);
  }

  @Patch('me')
  updateCurrentUser(@Body() dto: UpdateCurrentUserDto, @Req() req: any) {
    return this.usersService.updateCurrentUser(dto, req.user);
  }

  @Get()
  @Roles('OWNER')
  findAll(@Req() req: any) {
    return this.usersService.findAll(req.user);
  }

  @Get('invitations')
  @Roles('OWNER')
  listInvitations(@Req() req: any) {
    return this.usersService.listInvitations(req.user);
  }

  @Post('invitations')
  @Roles('OWNER')
  createInvitation(@Body() dto: CreateInvitationDto, @Req() req: any) {
    return this.usersService.createInvitation(dto, req.user);
  }

  @Delete('invitations/:id')
  @Roles('OWNER')
  revokeInvitation(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.usersService.revokeInvitation(id, req.user);
  }

  @Patch(':id')
  @Roles('OWNER')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Req() req: any,
  ) {
    return this.usersService.update(id, dto, req.user);
  }

  @Patch(':id/status')
  @Roles('OWNER')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: any,
  ) {
    return this.usersService.updateStatus(id, dto, req.user);
  }
}