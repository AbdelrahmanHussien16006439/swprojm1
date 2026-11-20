import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsMongoId, IsNotEmpty, IsNumber, IsString, Matches, Min } from 'class-validator';

export class CreateItineraryTransportCostDto {
  @ApiProperty({ example: 'Train' })
  @IsString({ message: 'mode must be a string' })
  @IsNotEmpty({ message: 'mode is required' })
  mode: string;

  @ApiProperty({ example: 'cairo', description: 'Seeded city ID or MongoDB ID' })
  @IsString({ message: 'fromCityId must be a string' })
  @IsNotEmpty({ message: 'fromCityId is required' })
  fromCityId: string;

  @ApiProperty({ example: 'alexandria', description: 'Seeded city ID or MongoDB ID' })
  @IsString({ message: 'toCityId must be a string' })
  @IsNotEmpty({ message: 'toCityId is required' })
  toCityId: string;

  @ApiProperty({ example: 120, minimum: 0 })
  @Type(() => Number)
  @IsNumber({}, { message: 'amount must be a number' })
  @Min(0, { message: 'amount must be at least 0' })
  amount: number;

  @ApiProperty({ example: 'EGP', pattern: '^[A-Za-z]{3}$' })
  @IsString({ message: 'currency must be a string' })
  @Matches(/^[A-Za-z]{3}$/, { message: 'currency must be a three-letter currency code' })
  currency: string;

  @ApiProperty({ example: '665f1a7d34a4d74f029de123', description: 'Itinerary day subdocument ID' })
  @IsMongoId({ message: 'dayId must be a valid day id' })
  dayId: string;
}
