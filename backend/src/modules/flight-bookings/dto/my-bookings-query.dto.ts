import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class MyBookingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['upcoming', 'past', 'cancelled'], example: 'upcoming' })
  @IsOptional()
  @IsIn(['upcoming', 'past', 'cancelled'], {
    message: 'group must be upcoming, past, or cancelled',
  })
  group?: 'upcoming' | 'past' | 'cancelled';
}

/** FLT-29: standard pagination for an airline moderator's flight bookings. */
export class ModeratorBookingsQueryDto extends PaginationQueryDto {}
