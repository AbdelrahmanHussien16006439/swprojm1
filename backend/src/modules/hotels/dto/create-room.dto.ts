import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ example: 'Deluxe King 301' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name is required' })
  name: string;

  @ApiProperty({ example: 'Deluxe' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'type must be a string' })
  @IsNotEmpty({ message: 'type is required' })
  type: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'beds must be a whole number' })
  @Min(1, { message: 'beds must be at least 1' })
  beds: number;

  @ApiProperty({ example: 2, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'maxOccupancy must be a whole number' })
  @Min(1, { message: 'maxOccupancy must be at least 1' })
  maxOccupancy: number;

  @ApiProperty({ example: 120, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({}, { message: 'pricePerNight must be a number' })
  @IsPositive({ message: 'pricePerNight must be greater than 0' })
  pricePerNight: number;
}
