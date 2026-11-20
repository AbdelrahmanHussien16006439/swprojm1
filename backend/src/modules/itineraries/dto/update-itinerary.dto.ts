import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateItineraryDto } from './create-itinerary.dto';

export class UpdateItineraryDto extends PartialType(CreateItineraryDto) {
  @ApiPropertyOptional({ example: true, description: 'Public itineraries are read-only to other users' })
  @IsOptional()
  @IsBoolean({ message: 'isPublic must be a boolean' })
  isPublic?: boolean;
}
