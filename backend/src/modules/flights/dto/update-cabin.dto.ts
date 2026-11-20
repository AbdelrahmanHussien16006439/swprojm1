import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class UpdateCabinDto {
  @ApiPropertyOptional({ example: 275 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @ApiPropertyOptional({ example: 190 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  totalSeats?: number;
}
