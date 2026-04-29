import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { MonitorType } from '@prisma/client';

export class CreateMonitorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(MonitorType)
  type: MonitorType;

  @IsString()
  @IsUrl({ require_protocol: true })
  target: string;

  @IsOptional()
  @IsInt()
  expectedStatusCode?: number;

  @IsOptional()
  @IsInt()
  @Min(30)
  frequencySeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  timeoutSeconds?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locations?: string[];

  @IsOptional()
  @IsBoolean()
  alertEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  alertPush?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  alertThreshold?: number;
}