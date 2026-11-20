import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class BudgetSummaryQueryDto {
  @ApiPropertyOptional({ example: 'EUR', pattern: '^[A-Za-z]{3}$', description: 'Currency override; otherwise uses the signed-in viewer’s preference or the itinerary owner’s preference for guests' })
  @IsOptional()
  @IsString({ message: 'currency must be a string' })
  @Matches(/^[A-Za-z]{3}$/, { message: 'currency must be a three-letter currency code' })
  currency?: string;
}
