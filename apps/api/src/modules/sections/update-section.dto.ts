import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateSectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  monitorIds?: number[];

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
  isActive?: boolean;
}
