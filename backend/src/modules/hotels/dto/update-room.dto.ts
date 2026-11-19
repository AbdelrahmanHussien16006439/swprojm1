import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator';

export class UpdateRoomDto {
  @ApiPropertyOptional({ example: 2, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'beds must be a whole number' })
  @Min(1, { message: 'beds must be at least 1' })
  beds?: number;

  @ApiPropertyOptional({ example: 2, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'maxOccupancy must be a whole number' })
  @Min(1, { message: 'maxOccupancy must be at least 1' })
  maxOccupancy?: number;

  @ApiPropertyOptional({ example: 135, minimum: 0.01 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'pricePerNight must be a number' })
  @IsPositive({ message: 'pricePerNight must be greater than 0' })
  pricePerNight?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}
