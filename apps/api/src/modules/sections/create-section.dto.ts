import { IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const sectionIcons = ['folder', 'globe', 'monitor', 'database', 'cloud', 'code', 'drive'] as const;

export class CreateSectionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @IsOptional()
  @IsIn(sectionIcons)
  icon?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  monitorIds?: number[];
}
