import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  ReportStatus,
  ReportTargetType,
} from '../../reports/schemas/report.schema';

export class ListReportsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ReportTargetType,
    example: ReportTargetType.POST,
  })
  @IsOptional()
  @IsEnum(ReportTargetType)
  targetType?: ReportTargetType;

  @ApiPropertyOptional({ enum: ReportStatus, example: ReportStatus.OPEN })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;
}
