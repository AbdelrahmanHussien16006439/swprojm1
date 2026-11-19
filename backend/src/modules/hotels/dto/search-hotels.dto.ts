import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class SearchHotelsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'cairo', description: 'Official city id or City ObjectId.' })
  @IsOptional()
  @IsString({ message: 'cityId must be a string' })
  cityId?: string;

  @ApiPropertyOptional({ example: 'EG', description: 'Official country code or Country ObjectId.' })
  @IsOptional()
  @IsString({ message: 'countryId must be a string' })
  countryId?: string;

  @ApiProperty({ example: '2026-12-10', description: 'Check-in date (UTC calendar date).' })
  @IsDateString({ strict: true }, { message: 'checkIn must be a valid YYYY-MM-DD date' })
  checkIn: string;

  @ApiProperty({ example: '2026-12-15', description: 'Check-out date (UTC calendar date).' })
  @IsDateString({ strict: true }, { message: 'checkOut must be a valid YYYY-MM-DD date' })
  checkOut: string;

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

  @ApiPropertyOptional({ example: 50, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'minPrice must be a number' })
  @Min(0, { message: 'minPrice must not be negative' })
  minPrice?: number;

  @ApiPropertyOptional({ example: 300, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'maxPrice must be a number' })
  @Min(0, { message: 'maxPrice must not be negative' })
  maxPrice?: number;

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'minRating must be a whole number' })
  @Min(1, { message: 'minRating must be at least 1' })
  @Max(5, { message: 'minRating must be at most 5' })
  minRating?: number;

  @ApiPropertyOptional({ example: 'price', enum: ['price', 'rating'], default: 'price' })
  @IsOptional()
  @IsIn(['price', 'rating'], { message: 'sortBy must be price or rating' })
  sortBy: 'price' | 'rating' = 'price';

  @ApiPropertyOptional({ example: 'asc', enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'order must be asc or desc' })
  order: 'asc' | 'desc' = 'asc';
}
