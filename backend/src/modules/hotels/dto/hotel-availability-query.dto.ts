import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class HotelAvailabilityQueryDto {
  @ApiProperty({ example: '2026-12-10', description: 'Check-in date (UTC calendar date).' })
  @IsDateString({ strict: true }, { message: 'checkIn must be a valid YYYY-MM-DD date' })
  checkIn: string;

  @ApiProperty({ example: '2026-12-15', description: 'Check-out date (UTC calendar date).' })
  @IsDateString({ strict: true }, { message: 'checkOut must be a valid YYYY-MM-DD date' })
  checkOut: string;
}
