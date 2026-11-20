import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class FlightSelectionDto {
  @ApiProperty({ example: '665f1c2a6d3b4c5e7f8a9012' })
  @IsString({ message: 'flightId must be a string' })
  @Matches(/^[a-f\d]{24}$/i, { message: 'flightId must be a valid ObjectId' })
  flightId: string;

  @ApiProperty({ example: '665f1c2a6d3b4c5e7f8a9013' })
  @IsString({ message: 'cabinId must be a string' })
  @Matches(/^[a-f\d]{24}$/i, { message: 'cabinId must be a valid ObjectId' })
  cabinId: string;
}

export class BookingPassengerDto {
  @ApiProperty({ example: 'Alex Traveller', maxLength: 120 })
  @IsString({ message: 'fullName must be a string' })
  @Matches(/\S/, { message: 'fullName must not be empty' })
  @MaxLength(120, { message: 'fullName must be at most 120 characters' })
  fullName: string;

  @ApiProperty({ example: '2010-05-20', description: 'Date of birth in YYYY-MM-DD format.' })
  @IsDateString({ strict: true }, { message: 'dateOfBirth must be a valid YYYY-MM-DD date' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateOfBirth must be in YYYY-MM-DD format',
  })
  dateOfBirth: string;

  @ApiProperty({ example: 'P12345678', maxLength: 80 })
  @IsString({ message: 'documentNumber must be a string' })
  @Matches(/\S/, { message: 'documentNumber must not be empty' })
  @MaxLength(80, { message: 'documentNumber must be at most 80 characters' })
  documentNumber: string;

  @ApiPropertyOptional({ example: 1, minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'extraBags must be a whole number' })
  @Min(0, { message: 'extraBags must be at least zero' })
  extraBags?: number;

  @ApiPropertyOptional({ example: 20, minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'extraBagsWeightKg must be a number' })
  @Min(0, { message: 'extraBagsWeightKg must be at least zero' })
  extraBagsWeightKg?: number;
}

export class CreateBookingSummaryDto {
  @ApiProperty({ type: FlightSelectionDto })
  @ValidateNested()
  @Type(() => FlightSelectionDto)
  outbound: FlightSelectionDto;

  @ApiPropertyOptional({ type: FlightSelectionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FlightSelectionDto)
  return?: FlightSelectionDto;

  @ApiProperty({ type: [BookingPassengerDto], minItems: 1 })
  @IsArray({ message: 'passengers must be an array' })
  @ArrayMinSize(1, { message: 'passengers must contain at least one passenger' })
  @ValidateNested({ each: true })
  @Type(() => BookingPassengerDto)
  passengers: BookingPassengerDto[];
}
