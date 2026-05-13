import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, Min } from 'class-validator';

export class UpdateSectionMembersDto {
  @IsArray()
  @ArrayMaxSize(200)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  userIds!: number[];
}
