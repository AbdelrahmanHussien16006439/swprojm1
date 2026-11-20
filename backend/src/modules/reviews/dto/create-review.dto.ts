import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt({ message: 'rating must be a whole number' })
  @Min(1, { message: 'rating must be at least 1' })
  @Max(5, { message: 'rating must be at most 5' })
  rating: number;

  @ApiPropertyOptional({
    example: 'Comfortable room and helpful staff.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'text must be a string' })
  @MaxLength(1000, { message: 'text cannot exceed 1000 characters' })
  text?: string;
}
