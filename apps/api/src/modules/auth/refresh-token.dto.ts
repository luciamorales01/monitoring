import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'rft_2dc1d3b0f0b346f9a4e3dd9fdd5c5c2a',
    description: 'Refresh token opaco emitido durante el login.',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
