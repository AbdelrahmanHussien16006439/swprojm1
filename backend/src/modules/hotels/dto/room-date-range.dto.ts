import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RoomDateRangeDto {
  @ApiProperty({ example: '2026-12-01', description: 'UTC calendar date, inclusive.' })
  @IsDateString({ strict: true }, { message: 'startDate must be a valid YYYY-MM-DD date' })
  startDate: string;

  @ApiProperty({ example: '2026-12-31', description: 'UTC calendar date, inclusive.' })
  @IsDateString({ strict: true }, { message: 'endDate must be a valid YYYY-MM-DD date' })
  endDate: string;
}

export class UpdateRoomAvailabilityDto {
  @ApiPropertyOptional({ type: [RoomDateRangeDto] })
  @IsOptional()
  @IsArray({ message: 'availabilityRanges must be an array' })
  @ValidateNested({ each: true })
  @Type(() => RoomDateRangeDto)
  availabilityRanges?: RoomDateRangeDto[];

  @ApiPropertyOptional({ type: [RoomDateRangeDto] })
  @IsOptional()
  @IsArray({ message: 'blockedRanges must be an array' })
  @ValidateNested({ each: true })
  @Type(() => RoomDateRangeDto)
  blockedRanges?: RoomDateRangeDto[];
}
