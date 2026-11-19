import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateItineraryDto {
  @ApiProperty({ example: 'A week in Egypt', maxLength: 100 })
  @IsString({ message: 'title must be a string' })
  @IsNotEmpty({ message: 'title is required' })
  @Matches(/\S/, { message: 'title must not be blank' })
  @MaxLength(100, { message: 'title must be at most 100 characters' })
  title: string;

  @ApiProperty({ example: ['EG'], description: 'Seeded country codes or MongoDB IDs' })
  @IsArray({ message: 'countryIds must be an array' })
  @ArrayMinSize(1, { message: 'countryIds must contain at least one country' })
  @IsString({ each: true, message: 'each countryId must be a string' })
  @IsNotEmpty({ each: true, message: 'countryIds cannot contain an empty value' })
  countryIds: string[];

  @ApiProperty({ example: '2026-12-01', description: 'Calendar date in YYYY-MM-DD format' })
  @IsDateString({ strict: true }, { message: 'startDate must be a valid date' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must use YYYY-MM-DD format' })
  startDate: string;
}
