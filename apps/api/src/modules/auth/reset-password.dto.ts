import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'prt_6fe82f1c2d21467e97e581f9b60ea0cb',
    description: 'Token de recuperacion recibido por email.',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'MyN3wPass!',
    minLength: 6,
    description: 'Nueva contrasena del usuario.',
  })
  @IsString()
  @MinLength(6)
  password: string;
}
