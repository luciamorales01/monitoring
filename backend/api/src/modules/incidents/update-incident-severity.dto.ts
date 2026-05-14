import { ApiProperty } from '@nestjs/swagger';
import { IncidentSeverity } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateIncidentSeverityDto {
  @ApiProperty({
    enum: IncidentSeverity,
    example: IncidentSeverity.HIGH,
    description: 'Nueva severidad de la incidencia.',
  })
  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;
}
