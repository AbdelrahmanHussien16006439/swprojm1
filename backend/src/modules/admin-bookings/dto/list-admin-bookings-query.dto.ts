import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { FLIGHT_BOOKING_STATUSES } from '../../flight-bookings/schemas/flight-booking.schema';

const BOOKING_STATUSES = [...FLIGHT_BOOKING_STATUSES];

export class ListAdminBookingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['flight', 'hotel'] })
  @IsOptional()
  @IsIn(['flight', 'hotel'])
  type?: 'flight' | 'hotel';

  @ApiPropertyOptional({ enum: BOOKING_STATUSES })
  @IsOptional()
  @IsIn(BOOKING_STATUSES)
  status?: string;

  @ApiPropertyOptional({
    description: 'Inclusive travel date, YYYY-MM-DD',
    example: '2026-12-01',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  from?: string;

  @ApiPropertyOptional({
    description: 'Inclusive travel date, YYYY-MM-DD',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  to?: string;
}
