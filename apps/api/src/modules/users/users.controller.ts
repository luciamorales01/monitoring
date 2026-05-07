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
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Req() req: any,
  ) {
    return this.usersService.update(id, dto, req.user);
  }
}