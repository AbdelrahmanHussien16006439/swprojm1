import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { HOTEL_BOOKING_STATUSES } from '../schemas/hotel-booking.schema';

export class HotelModeratorReservationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'confirmed',
    enum: HOTEL_BOOKING_STATUSES,
  })
  @IsOptional()
  @IsIn(HOTEL_BOOKING_STATUSES, {
    message: `status must be one of: ${HOTEL_BOOKING_STATUSES.join(', ')}`,
  })
  status?: (typeof HOTEL_BOOKING_STATUSES)[number];

  @ApiPropertyOptional({
    example: '2026-12-01',
    description: 'Inclusive UTC check-in date lower bound.',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'from must be a valid YYYY-MM-DD date',
  })
  @IsDateString({ strict: true }, { message: 'from must be a valid date' })
  from?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Inclusive UTC check-in date upper bound.',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'to must be a valid YYYY-MM-DD date',
  })
  @IsDateString({ strict: true }, { message: 'to must be a valid date' })
  to?: string;
}
