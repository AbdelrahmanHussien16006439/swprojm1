import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateItineraryDayDto {
  @ApiPropertyOptional({ example: 'alexandria', description: 'Seeded city ID or MongoDB ID' })
  @IsOptional()
  @IsString({ message: 'cityId must be a string' })
  @IsNotEmpty({ message: 'cityId cannot be empty' })
  cityId?: string;

  @ApiPropertyOptional({ example: 'Visit the Citadel' })
  @IsOptional()
  @IsString({ message: 'notes must be a string' })
  notes?: string;
}
