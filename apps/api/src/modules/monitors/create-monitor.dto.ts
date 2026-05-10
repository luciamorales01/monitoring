import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
    description: 'Objetivo a comprobar: URL, host, dominio o endpoint.',
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
    description: 'Codigo HTTP esperado para monitores HTTP/HTTPS.',
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
    example: ['eu-west-1', 'us-east-1'],
    description: 'Ubicaciones desde las que se ejecutaran los chequeos.',
    type: [String],
    maxItems: 10,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  locations?: string[];

  @ApiPropertyOptional({
    example: true,
    description: 'Activa alertas por email.',
  })
  @IsOptional()
  @IsBoolean()
  alertEmail?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Activa alertas push.',
  })
  @IsOptional()
  @IsBoolean()
  alertPush?: boolean;

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

  @ApiPropertyOptional({
    example: 443,
    minimum: 1,
    maximum: 65535,
    description: 'Puerto TCP. Obligatorio cuando `type` es `TCP`.',
  })
  @ValidateIf((dto) => dto.type === MonitorType.TCP)
  @IsInt()
  @Min(1)
  @Max(65535)
  tcpPort?: number;

  @ApiPropertyOptional({
    example: 'healthy',
    description: 'Texto esperado dentro de la respuesta.',
    maxLength: 240,
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  keyword?: string;

  @ApiPropertyOptional({
    example: 14,
    minimum: 1,
    maximum: 365,
    description: 'Dias de antelacion para alertar sobre expiracion SSL.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  sslWarningDays?: number;

  @ApiPropertyOptional({
    enum: DNS_RECORD_TYPES,
    example: 'A',
    description: 'Tipo de registro DNS esperado.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(12)
  dnsRecordType?: string;

  @ApiPropertyOptional({
    example: '203.0.113.42',
    description: 'Valor DNS esperado para validar el resultado.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  dnsExpectedValue?: string;
}

export { DNS_RECORD_TYPES };
