import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
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
  @IsIn(['folder', 'globe', 'monitor', 'database', 'cloud', 'code', 'drive'])
  icon?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
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
