import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'owner@acme-monitoring.com',
    description: 'Email del usuario.',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Str0ngPass!',
    minLength: 6,
    description: 'Contrasena del usuario.',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Mantiene la sesion durante un periodo mas largo.',
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
