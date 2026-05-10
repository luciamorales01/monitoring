import { Type } from 'class-transformer';
import { IsArray, IsInt } from 'class-validator';

export class UpdateSectionMembersDto {
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  userIds!: number[];
}
