import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const HOTEL_BOOKING_GROUPS = ['upcoming', 'past', 'cancelled'] as const;
export type HotelBookingGroup = (typeof HOTEL_BOOKING_GROUPS)[number];

export class MyHotelBookingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'upcoming',
    enum: HOTEL_BOOKING_GROUPS,
    description: 'Filter your reservations by lifecycle group.',
  })
  @IsOptional()
  @IsIn(HOTEL_BOOKING_GROUPS, {
    message: 'group must be upcoming, past, or cancelled',
  })
  group?: HotelBookingGroup;
}
