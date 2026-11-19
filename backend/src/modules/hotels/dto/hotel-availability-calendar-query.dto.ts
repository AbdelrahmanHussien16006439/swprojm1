import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class HotelAvailabilityCalendarQueryDto {
  @ApiProperty({ example: '2026-12-10', description: 'First calendar date, inclusive (UTC).' })
  @IsDateString({ strict: true }, { message: 'from must be a valid YYYY-MM-DD date' })
  from: string;

  @ApiProperty({ example: '2026-12-15', description: 'Last calendar date, inclusive (UTC).' })
  @IsDateString({ strict: true }, { message: 'to must be a valid YYYY-MM-DD date' })
  to: string;
}
