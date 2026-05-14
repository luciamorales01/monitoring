import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export const REPORT_RANGES = ['24h', '7d', '30d'] as const;
export const REPORT_FORMATS = ['csv', 'pdf', 'xlsx'] as const;

export type ReportRange = (typeof REPORT_RANGES)[number];
export type ReportFormat = (typeof REPORT_FORMATS)[number];

function optionalPositiveInt(value: unknown) {
  if (value === undefined || value === null || value === '' || value === 'all') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : value;
}

export class ReportSummaryQueryDto {
  @IsOptional()
  @IsIn(REPORT_RANGES)
  range?: ReportRange;

  @IsOptional()
  @Transform(({ value }) => optionalPositiveInt(value))
  @IsInt()
  @Min(1)
  monitorId?: number;

  @IsOptional()
  @Transform(({ value }) => optionalPositiveInt(value))
  @IsInt()
  @Min(1)
  sectionId?: number;
}

export class ReportExportQueryDto extends ReportSummaryQueryDto {
  @IsOptional()
  @IsIn(REPORT_FORMATS)
  format?: ReportFormat;
}
