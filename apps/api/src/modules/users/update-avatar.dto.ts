import { Transform } from 'class-transformer';
import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateAvatarDto {
  @ValidateIf((dto: UpdateAvatarDto) => dto.dataUrl !== null)
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  dataUrl?: string | null;
}
