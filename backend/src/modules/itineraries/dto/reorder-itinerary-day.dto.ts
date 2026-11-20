import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsMongoId, Max, Min } from 'class-validator';
import { MAX_ITINERARY_DAYS } from '../itineraries.constants';

export class ReorderItineraryDayDto {
  @ApiProperty({ example: '665f1a7d34a4d74f029de123' })
  @IsMongoId({ message: 'dayId must be a valid day id' })
  dayId: string;

  @ApiProperty({ example: 3, minimum: 1, maximum: MAX_ITINERARY_DAYS })
  @IsInt({ message: 'newPosition must be a whole number' })
  @Min(1, { message: 'newPosition must be at least 1' })
  @Max(MAX_ITINERARY_DAYS, { message: 'newPosition cannot exceed 60' })
  newPosition: number;
}
