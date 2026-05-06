import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MonitorType } from '@prisma/client';

export class CreateMonitorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsEnum(MonitorType)
  type: MonitorType;

  @IsString()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  target: string;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(599)
  expectedStatusCode?: number;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(86_400)
  frequencySeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  timeoutSeconds?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
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
  @Max(20)
  alertThreshold?: number;
}
