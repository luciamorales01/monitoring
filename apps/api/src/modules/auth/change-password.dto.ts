import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

const STRONG_PASSWORD_MESSAGE =
  'La contrasena debe incluir mayuscula, minuscula, numero y simbolo.';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'Str0ngPass!',
    minLength: 6,
    description: 'Contrasena actual del usuario autenticado.',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  currentPassword: string;

  @ApiProperty({
    example: 'MyN3wPass!',
    minLength: 8,
    description: 'Nueva contrasena que reemplazara a la actual.',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message: STRONG_PASSWORD_MESSAGE,
  })
  newPassword: string;
}
