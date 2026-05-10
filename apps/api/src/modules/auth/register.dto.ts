import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'Lucia Morales',
    description: 'Nombre completo del usuario propietario inicial.',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'owner@acme-monitoring.com',
    description: 'Email unico del propietario de la organizacion.',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Str0ngPass!',
    minLength: 6,
    description: 'Contrasena de acceso.',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'Acme Monitoring',
    description: 'Nombre comercial de la organizacion que se creara.',
  })
  @IsString()
  @IsNotEmpty()
  organizationName: string;
}
