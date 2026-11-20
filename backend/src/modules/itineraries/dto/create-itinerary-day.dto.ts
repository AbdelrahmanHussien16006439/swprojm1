import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { MAX_ITINERARY_DAYS } from '../itineraries.constants';

export class CreateItineraryDayDto {
  @ApiProperty({ example: 'cairo', description: 'Seeded city ID or MongoDB ID' })
  @IsString({ message: 'cityId must be a string' })
  @IsNotEmpty({ message: 'cityId is required' })
  cityId: string;

  @ApiPropertyOptional({ example: 'Visit the Egyptian Museum' })
  @IsOptional()
  @IsString({ message: 'notes must be a string' })
  notes?: string;

  @ApiPropertyOptional({ example: 2, minimum: 1, maximum: MAX_ITINERARY_DAYS, description: 'One-based insertion position; omitted appends the day' })
  @IsOptional()
  @IsInt({ message: 'position must be a whole number' })
  @Min(1, { message: 'position must be at least 1' })
  @Max(MAX_ITINERARY_DAYS, { message: 'position cannot exceed 60' })
  position?: number;
}
