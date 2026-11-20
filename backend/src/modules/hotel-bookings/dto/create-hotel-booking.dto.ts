import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsMongoId,
  IsOptional,
  Matches,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { HOTEL_BOOKING_CHILD_MAX_AGE } from '../hotel-bookings.constants';

export class HotelBookingRoomRequestDto {
  @ApiProperty({ example: '665f1d4a2a8c7b4e5f123456' })
  @IsMongoId({ message: 'roomId must be a valid MongoDB ObjectId' })
  roomId: string;

  @ApiProperty({
    example: 1,
    minimum: 0,
    description:
      'Adults assigned to this room. At least one adult is required across the whole reservation.',
  })
  @Type(() => Number)
  @IsInt({ message: 'adults must be a whole number' })
  @Min(0, { message: 'adults cannot be negative' })
  adults: number;

  @ApiPropertyOptional({
    example: [8, 14],
    type: [Number],
    description: 'Children ages from 0 through 17.',
  })
  @IsOptional()
  @IsArray({ message: 'childrenAges must be an array' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'each child age must be a whole number' })
  @Min(0, { each: true, message: 'child ages cannot be negative' })
  @Max(HOTEL_BOOKING_CHILD_MAX_AGE, {
    each: true,
    message: `child ages cannot exceed ${HOTEL_BOOKING_CHILD_MAX_AGE}`,
  })
  childrenAges: number[] = [];
}

export class CreateHotelBookingDto {
  @ApiProperty({ example: '665f1d4a2a8c7b4e5f123456' })
  @IsMongoId({ message: 'hotelId must be a valid MongoDB ObjectId' })
  hotelId: string;

  @ApiProperty({ example: '2026-12-10', description: 'UTC calendar date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'checkIn must be a valid YYYY-MM-DD date',
  })
  @IsDateString({ strict: true }, { message: 'checkIn must be a valid date' })
  checkIn: string;

  @ApiProperty({ example: '2026-12-13', description: 'UTC calendar date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'checkOut must be a valid YYYY-MM-DD date',
  })
  @IsDateString({ strict: true }, { message: 'checkOut must be a valid date' })
  checkOut: string;

  @ApiProperty({
    type: [HotelBookingRoomRequestDto],
    example: [
      {
        roomId: '665f1d4a2a8c7b4e5f123456',
        adults: 1,
        childrenAges: [],
      },
      {
        roomId: '665f1d4a2a8c7b4e5f123457',
        adults: 0,
        childrenAges: [8, 14],
      },
    ],
  })
  @IsArray({ message: 'rooms must be an array' })
  @ArrayMinSize(1, { message: 'at least one room is required' })
  @ValidateNested({ each: true })
  @Type(() => HotelBookingRoomRequestDto)
  rooms: HotelBookingRoomRequestDto[];
}
