import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class AcceptInvitationDto {
  @ApiProperty({
    example: 'inv_6fe82f1c2d21467e97e581f9b60ea0cb',
    description: 'Token unico de invitacion recibido por email.',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'Ana Admin',
    maxLength: 120,
    description: 'Nombre completo del usuario invitado.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiProperty({
    example: 'AdminPass123',
    minLength: 6,
    description: 'Contrasena inicial de la cuenta invitada.',
  })
  @IsString()
  @MinLength(6)
  password: string;
}
