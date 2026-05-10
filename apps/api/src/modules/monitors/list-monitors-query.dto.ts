import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { MonitorType } from '@prisma/client';

export const MONITOR_LIST_SORT_OPTIONS = [
  'status',
  'name',
  'latest-check',
  'created-at',
] as const;

export const MONITOR_LIST_STATUS_OPTIONS = [
  'ALL',
  'UP',
  'DOWN',
  'PAUSED',
  'UNKNOWN',
] as const;

export type MonitorListSortOption = (typeof MONITOR_LIST_SORT_OPTIONS)[number];
export type MonitorListStatusOption =
  (typeof MONITOR_LIST_STATUS_OPTIONS)[number];

export class ListMonitorsQueryDto {
  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    description: 'Pagina solicitada.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    maximum: 100,
    description: 'Tamano de pagina.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    example: 'homepage',
    description: 'Texto a buscar por nombre o target.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: MONITOR_LIST_SORT_OPTIONS,
    example: 'status',
    description: 'Criterio de ordenacion.',
  })
  @IsOptional()
  @IsIn(MONITOR_LIST_SORT_OPTIONS)
  sort?: MonitorListSortOption;

  @ApiPropertyOptional({
    enum: MONITOR_LIST_STATUS_OPTIONS,
    example: 'DOWN',
    description: 'Filtro por estado operativo.',
  })
  @IsOptional()
  @IsIn(MONITOR_LIST_STATUS_OPTIONS)
  status?: MonitorListStatusOption;

  @ApiPropertyOptional({
    enum: MonitorType,
    example: MonitorType.HTTP,
    description: 'Filtro por tipo de monitor.',
  })
  @IsOptional()
  @IsEnum(MonitorType)
  type?: MonitorType;

  @ApiPropertyOptional({
    example: 'eu-west-1',
    description: 'Filtro por ubicacion configurada.',
  })
  @IsOptional()
  @IsString()
  location?: string;
}
