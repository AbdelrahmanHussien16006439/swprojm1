import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { ReportTargetType } from '../schemas/report.schema';

export class CreateReportDto {
  @ApiProperty({ enum: ReportTargetType, example: ReportTargetType.POST })
  @IsEnum(ReportTargetType, {
    message: 'targetType must be post, comment, review, or itinerary',
  })
  targetType!: ReportTargetType;

  @ApiProperty({ example: '665f1e77d8e043d0b1c0a123' })
  @IsMongoId({ message: 'targetId must be a valid MongoDB id' })
  targetId!: string;

  @ApiProperty({ example: 'This content is inappropriate' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'reason must be a string' })
  @IsNotEmpty({ message: 'reason is required' })
  reason!: string;
}
