import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ItineraryHotelsQueryDto extends PaginationQueryDto {
  @ApiProperty({ example: 0, minimum: 0, description: 'Zero-based city-group index from the itinerary details' })
  @Type(() => Number)
  @IsInt({ message: 'groupIndex must be a whole number' })
  @Min(0, { message: 'groupIndex must be at least 0' })
  groupIndex: number;

  @ApiProperty({ example: 2, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'guests must be a whole number' })
  @Min(1, { message: 'guests must be at least 1' })
  guests: number;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'rooms must be a whole number' })
  @Min(1, { message: 'rooms must be at least 1' })
  rooms = 1;
}
