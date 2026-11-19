import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNumber,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const HOTEL_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export class HotelCancellationTierDto {
  @ApiProperty({ example: 30, description: 'Days before the check-in date.' })
  @Type(() => Number)
  @IsInt({ message: 'daysBefore must be a whole number' })
  @Min(0, { message: 'daysBefore must be at least 0' })
  daysBefore: number;

  @ApiProperty({ example: 75, minimum: 0, maximum: 100 })
  @Type(() => Number)
  @IsNumber({}, { message: 'refundPercent must be a number' })
  @Min(0, { message: 'refundPercent must be at least 0' })
  @Max(100, { message: 'refundPercent must be at most 100' })
  refundPercent: number;
}

export class UpdateHotelPoliciesDto {
  @ApiProperty({ example: '14:00', description: 'Standard local check-in time (HH:mm).' })
  @Matches(HOTEL_TIME_PATTERN, {
    message: 'checkInTime must be a valid 24-hour time in HH:mm format',
  })
  checkInTime: string;

  @ApiProperty({ example: '11:00', description: 'Standard local check-out time (HH:mm).' })
  @Matches(HOTEL_TIME_PATTERN, {
    message: 'checkOutTime must be a valid 24-hour time in HH:mm format',
  })
  checkOutTime: string;

  @ApiProperty({
    type: [HotelCancellationTierDto],
    example: [
      { daysBefore: 30, refundPercent: 75 },
      { daysBefore: 7, refundPercent: 25 },
      { daysBefore: 0, refundPercent: 0 },
    ],
  })
  @IsArray({ message: 'tiers must be an array' })
  @ValidateNested({ each: true })
  @Type(() => HotelCancellationTierDto)
  @ArrayUnique((tier: HotelCancellationTierDto) => tier.daysBefore, {
    message: 'daysBefore values must be unique',
  })
  tiers: HotelCancellationTierDto[];
}
