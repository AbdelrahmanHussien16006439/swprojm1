import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';
import { CreateHotelDto } from './create-hotel.dto';

const HOTEL_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export class UpdateHotelDto extends PartialType(CreateHotelDto) {
  @ApiPropertyOptional({ example: '14:00', description: 'Standard local check-in time (HH:mm).' })
  @IsOptional()
  @Matches(HOTEL_TIME_PATTERN, {
    message: 'checkInTime must be a valid 24-hour time in HH:mm format',
  })
  checkInTime?: string;

  @ApiPropertyOptional({ example: '11:00', description: 'Standard local check-out time (HH:mm).' })
  @IsOptional()
  @Matches(HOTEL_TIME_PATTERN, {
    message: 'checkOutTime must be a valid 24-hour time in HH:mm format',
  })
  checkOutTime?: string;
}
