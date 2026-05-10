import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'Str0ngPass!',
    minLength: 6,
    description: 'Contrasena actual del usuario autenticado.',
  })
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @ApiProperty({
    example: 'MyN3wPass!',
    minLength: 6,
    description: 'Nueva contrasena que reemplazara a la actual.',
  })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
