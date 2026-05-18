import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MonitorType } from '@prisma/client';

export class CreateMonitorDto {
  @ApiProperty({
    example: 'Homepage production',
    description: 'Nombre descriptivo del monitor.',
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({
    enum: MonitorType,
    example: MonitorType.HTTP,
    description: 'Tipo de monitor a ejecutar.',
  })
  @IsEnum(MonitorType)
  type: MonitorType;

  @ApiProperty({
    example: 'https://status.acme.com/health',
    description: 'URL HTTP o HTTPS a comprobar.',
    maxLength: 2048,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  target: string;

  @ApiPropertyOptional({
    example: 200,
    minimum: 100,
    maximum: 599,
    description: 'Codigo HTTP esperado.',
  })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(599)
  expectedStatusCode?: number;

  @ApiPropertyOptional({
    example: 60,
    minimum: 30,
    maximum: 86400,
    description: 'Frecuencia de chequeo en segundos.',
  })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(86_400)
  frequencySeconds?: number;

  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    maximum: 60,
    description: 'Timeout maximo por chequeo en segundos.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  timeoutSeconds?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Activa alertas por email.',
  })
  @IsOptional()
  @IsBoolean()
  alertEmail?: boolean;

  @ApiPropertyOptional({
    example: 3,
    minimum: 1,
    maximum: 20,
    description: 'Numero de fallos consecutivos antes de abrir incidencia.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  alertThreshold?: number;
}
