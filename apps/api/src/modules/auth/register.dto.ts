import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const STRONG_PASSWORD_MESSAGE =
  'La contrasena debe incluir mayuscula, minuscula, numero y simbolo.';

export class RegisterDto {
  @ApiProperty({
    example: 'Lucia Morales',
    description: 'Nombre completo del usuario propietario inicial.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiProperty({
    example: 'owner@acme-monitoring.com',
    description: 'Email unico del propietario de la organizacion.',
  })
  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @ApiProperty({
    example: 'Str0ngPass!',
    minLength: 8,
    description: 'Contrasena de acceso.',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message: STRONG_PASSWORD_MESSAGE,
  })
  password: string;

  @ApiProperty({
    example: 'Acme Monitoring',
    description: 'Nombre comercial de la organizacion que se creara.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  organizationName: string;
}
