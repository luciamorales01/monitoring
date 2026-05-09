import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
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
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(MONITOR_LIST_SORT_OPTIONS)
  sort?: MonitorListSortOption;

  @IsOptional()
  @IsIn(MONITOR_LIST_STATUS_OPTIONS)
  status?: MonitorListStatusOption;

  @IsOptional()
  @IsEnum(MonitorType)
  type?: MonitorType;

  @IsOptional()
  @IsString()
  location?: string;
}
