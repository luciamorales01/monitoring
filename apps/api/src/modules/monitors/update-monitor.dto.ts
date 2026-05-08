import {
  ArrayMaxSize,
  IsArray,
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
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(MonitorType)
  type?: MonitorType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  target?: string;

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

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  tcpPort?: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  keyword?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  sslWarningDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  dnsRecordType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  dnsExpectedValue?: string;
}
