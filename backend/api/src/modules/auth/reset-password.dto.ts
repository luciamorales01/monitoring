import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const STRONG_PASSWORD_MESSAGE =
  'La contraseña debe incluir mayuscula, minuscula, numero y simbolo.';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'prt_6fe82f1c2d21467e97e581f9b60ea0cb',
    description: 'Token de recuperacion recibido por email.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  @MaxLength(128)
  token: string;

  @ApiProperty({
    example: 'MyN3wPass!',
    minLength: 8,
    description: 'Nueva contraseña del usuario.',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message: STRONG_PASSWORD_MESSAGE,
  })
  password: string;
}
