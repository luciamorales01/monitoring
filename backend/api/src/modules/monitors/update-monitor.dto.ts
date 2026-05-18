import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateMonitorDto {
  @ApiPropertyOptional({
    example: 'Homepage production',
    description: 'Nuevo nombre descriptivo del monitor.',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    enum: MonitorType,
    example: MonitorType.HTTP,
    description: 'Nuevo tipo de monitor.',
  })
  @IsOptional()
  @IsEnum(MonitorType)
  type?: MonitorType;

  @ApiPropertyOptional({
    example: 'https://status.acme.com/health',
    description: 'Nuevo objetivo del monitor.',
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  target?: string;

  @ApiPropertyOptional({
    example: 200,
    minimum: 100,
    maximum: 599,
    description: 'Nuevo codigo HTTP esperado.',
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
    description: 'Nueva frecuencia en segundos.',
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
    description: 'Nuevo timeout en segundos.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  timeoutSeconds?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Activa o desactiva alertas por email.',
  })
  @IsOptional()
  @IsBoolean()
  alertEmail?: boolean;

  @ApiPropertyOptional({
    example: 3,
    minimum: 1,
    maximum: 20,
    description: 'Nuevo umbral de fallos consecutivos.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  alertThreshold?: number;
}
