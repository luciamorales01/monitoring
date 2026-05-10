import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { IncidentSeverity, IncidentStatus } from '@prisma/client';

export class UpdateIncidentDto {
  @ApiPropertyOptional({
    enum: IncidentStatus,
    example: IncidentStatus.ACKNOWLEDGED,
    description: 'Nuevo estado de la incidencia.',
  })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @ApiPropertyOptional({
    enum: IncidentSeverity,
    example: IncidentSeverity.HIGH,
    description: 'Nueva severidad asignada.',
  })
  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @ApiPropertyOptional({
    example: 'Se reinicio el balanceador y el servicio volvio a responder.',
    maxLength: 500,
    description: 'Notas de resolucion visibles para auditoria.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  resolutionNote?: string;

  @ApiPropertyOptional({
    example: 'Despliegue defectuoso en produccion.',
    maxLength: 500,
    description: 'Causa raiz identificada.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rootCause?: string;
}
