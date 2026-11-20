import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export const ITINERARY_BUDGET_CATEGORIES = [
  'food',
  'accommodation',
  'in-city transport',
  'activities',
] as const;

export class CreateItineraryBudgetDto {
  @ApiProperty({ example: 'food', enum: ITINERARY_BUDGET_CATEGORIES })
  @IsIn(ITINERARY_BUDGET_CATEGORIES, { message: 'category must be food, accommodation, in-city transport, or activities' })
  category: (typeof ITINERARY_BUDGET_CATEGORIES)[number];

  @ApiProperty({ example: 25.5, minimum: 0 })
  @Type(() => Number)
  @IsNumber({}, { message: 'amount must be a number' })
  @Min(0, { message: 'amount must be at least 0' })
  amount: number;

  @ApiProperty({ example: 'EGP', pattern: '^[A-Za-z]{3}$' })
  @IsString({ message: 'currency must be a string' })
  @Matches(/^[A-Za-z]{3}$/, { message: 'currency must be a three-letter currency code' })
  currency: string;

  @ApiPropertyOptional({ example: 'Lunch near the museum' })
  @IsOptional()
  @IsString({ message: 'note must be a string' })
  note?: string;
}
