import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, Matches, MaxLength } from 'class-validator';

export class CreateFlightDto {
  @ApiProperty({ example: 'MS801' })
  @IsString({ message: 'flightNumber must be a string' })
  @Matches(/^[A-Za-z0-9-]+$/, { message: 'flightNumber contains invalid characters' })
  @MaxLength(20, { message: 'flightNumber must be at most 20 characters' })
  flightNumber: string;

  @ApiProperty({ example: '665f1c2a6d3b4c5e7f8a9012' })
  @IsString({ message: 'departureAirportId must be a string' })
  @Matches(/^[a-f\d]{24}$/i, { message: 'departureAirportId must be a valid ObjectId' })
  departureAirportId: string;

  @ApiProperty({ example: '2027-06-15T08:30:00', description: 'Local time at the departure airport.' })
  @IsDateString({}, { message: 'departureTime must be a valid ISO local date-time' })
  departureTime: string;

  @ApiProperty({ example: '665f1c2a6d3b4c5e7f8a9013' })
  @IsString({ message: 'arrivalAirportId must be a string' })
  @Matches(/^[a-f\d]{24}$/i, { message: 'arrivalAirportId must be a valid ObjectId' })
  arrivalAirportId: string;

  @ApiProperty({ example: '2027-06-15T12:45:00', description: 'Local time at the arrival airport.' })
  @IsDateString({}, { message: 'arrivalTime must be a valid ISO local date-time' })
  arrivalTime: string;
}
