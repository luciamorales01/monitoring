import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const STRONG_PASSWORD_MESSAGE =
  'La contrasena debe incluir mayuscula, minuscula, numero y simbolo.';

export class AcceptInvitationDto {
  @ApiProperty({
    example: 'inv_6fe82f1c2d21467e97e581f9b60ea0cb',
    description: 'Token unico de invitacion recibido por email.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  @MaxLength(128)
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
    minLength: 8,
    description: 'Contrasena inicial de la cuenta invitada.',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message: STRONG_PASSWORD_MESSAGE,
  })
  password: string;
}
