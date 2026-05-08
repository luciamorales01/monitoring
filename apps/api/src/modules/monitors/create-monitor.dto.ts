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
  ValidateIf,
} from 'class-validator';
import { MonitorType } from '@prisma/client';

const DNS_RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT'] as const;

export class CreateMonitorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsEnum(MonitorType)
  type: MonitorType;

  @IsString()
  @IsNotEmpty()
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

  @ValidateIf((dto) => dto.type === MonitorType.TCP)
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

export { DNS_RECORD_TYPES };
