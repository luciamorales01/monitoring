import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'owner@acme-monitoring.com',
    description: 'Email de la cuenta que solicita restablecer la contrasena.',
  })
  @IsEmail()
  email: string;
}
