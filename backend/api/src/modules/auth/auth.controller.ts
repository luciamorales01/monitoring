import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { RegisterDto } from './register.dto';
import { LoginDto } from './login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RefreshTokenDto } from './refresh-token.dto';
import { ForgotPasswordDto } from './forgot-password.dto';
import { ResetPasswordDto } from './reset-password.dto';
import { ChangePasswordDto } from './change-password.dto';
import { AcceptInvitationDto } from './accept-invitation.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registrar organizacion y usuario propietario',
    description:
      'Crea una nueva organizacion multi-tenant y devuelve una sesion autenticada.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'Registro completado correctamente.',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'rft_2dc1d3b0f0b346f9a4e3dd9fdd5c5c2a',
        user: {
          id: 1,
          name: 'Lucia Morales',
          email: 'owner@acme-monitoring.com',
          role: 'OWNER',
          status: 'ACTIVE',
          organizationId: 1,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Datos invalidos o email ya registrado.',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Iniciar sesion',
    description:
      'Autentica un usuario activo y devuelve access token y refresh token.',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Login correcto.',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'rft_2dc1d3b0f0b346f9a4e3dd9fdd5c5c2a',
        user: {
          id: 7,
          name: 'Ana Admin',
          email: 'ana@acme-monitoring.com',
          role: 'ADMIN',
          status: 'ACTIVE',
          organizationId: 1,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Credenciales incorrectas o usuario inactivo.',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Renovar sesion',
    description: 'Invalida el refresh token actual y emite una nueva sesion.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({
    description: 'Sesion renovada.',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'rft_newtoken_8a4f8b8f7d514d4dbfce',
        user: {
          id: 7,
          name: 'Ana Admin',
          email: 'ana@acme-monitoring.com',
          role: 'ADMIN',
          status: 'ACTIVE',
          organizationId: 1,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token invalido, revocado o expirado.',
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Cerrar sesion',
    description: 'Revoca el refresh token indicado.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({
    description: 'Token revocado.',
    schema: { example: { success: true } },
  })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Solicitar recuperacion de contraseña',
    description:
      'Inicia el flujo de recuperacion. En desarrollo puede devolver `resetUrl` y `resetToken`.',
  })
  @ApiOkResponse({
    description: 'Solicitud aceptada.',
    schema: {
      example: {
        message:
          'Si el email existe, recibirás instrucciones para restablecer la contraseña.',
        resetUrl:
          'http://localhost:5173/restablecer-password?token=prt_6fe82f1c2d21467e97e581f9b60ea0cb',
        resetToken: 'prt_6fe82f1c2d21467e97e581f9b60ea0cb',
      },
    },
  })
  @ApiBody({ type: ForgotPasswordDto })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Restablecer contraseña',
    description:
      'Consume un token de recuperacion valido y actualiza la contraseña.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({
    description: 'Contraseña restablecida.',
    schema: { example: { success: true } },
  })
  @ApiBadRequestResponse({ description: 'Token invalido o caducado.' })
  @ApiUnauthorizedResponse({ description: 'Usuario inactivo o no autorizado.' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('accept-invitation')
  @ApiOperation({
    summary: 'Aceptar invitacion',
    description:
      'Crea la cuenta del usuario invitado y devuelve sesion autenticada.',
  })
  @ApiBody({ type: AcceptInvitationDto })
  @ApiCreatedResponse({
    description: 'Invitacion aceptada.',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'rft_fcf3663ad4f04d9cb0f2af2f74e5a8f5',
        user: {
          id: 9,
          name: 'Ana Admin',
          email: 'ana@acme-monitoring.com',
          role: 'ADMIN',
          status: 'ACTIVE',
          organizationId: 1,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invitacion invalida, caducada o email ya registrado.',
  })
  acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.authService.acceptInvitation(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Cambiar contraseña del usuario autenticado',
    description:
      'Actualiza la contraseña actual y revoca las sesiones previas.',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({
    description: 'Contraseña actualizada.',
    schema: { example: { success: true } },
  })
  @ApiBadRequestResponse({
    description: 'Contraseña actual incorrecta o nueva contraseña invalida.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o usuario no autorizado.',
  })
  changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Obtener usuario actual',
    description: 'Devuelve perfil del usuario autenticado y su organizacion.',
  })
  @ApiOkResponse({
    description: 'Perfil actual.',
    schema: {
      example: {
        id: 7,
        name: 'Ana Admin',
        email: 'ana@acme-monitoring.com',
        role: 'ADMIN',
        status: 'ACTIVE',
        organizationId: 1,
        organization: {
          id: 1,
          name: 'Acme Monitoring',
          slug: 'acme-monitoring',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Token invalido o usuario inactivo.',
  })
  me(@Req() req: AuthenticatedRequest) {
    return this.authService.me(req.user.userId);
  }
}
