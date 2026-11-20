import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { CabinClass } from '../../flights/flights.constants';
import { FlightSortBy } from '../../flights/dto/search-flights.dto';

export enum ItineraryFlightTripType {
  ONE_WAY = 'one_way',
  ROUND_TRIP = 'round_trip',
}

export class ItineraryFlightsQueryDto extends PaginationQueryDto {
  @ApiProperty({ example: '665f1c2a6d3b4c5e7f8a9012' })
  @IsMongoId({ message: 'originAirportId must be a valid airport ObjectId' })
  originAirportId: string;

  @ApiProperty({ enum: ItineraryFlightTripType, example: ItineraryFlightTripType.ONE_WAY })
  @IsEnum(ItineraryFlightTripType, { message: 'tripType must be one_way or round_trip' })
  tripType: ItineraryFlightTripType;

  @ApiPropertyOptional({ example: '2027-06-15', description: 'Defaults to itinerary start date' })
  @IsOptional()
  @IsDateString({}, { message: 'departDate must be a valid ISO date' })
  departDate?: string;

  @ApiPropertyOptional({ example: '2027-06-22', description: 'Round-trip only; defaults to the last itinerary day' })
  @IsOptional()
  @IsDateString({}, { message: 'returnDate must be a valid ISO date' })
  returnDate?: string;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  adults = 1;

  @ApiPropertyOptional({ example: 0, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  children = 0;

  @ApiPropertyOptional({ example: 0, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  infants = 0;

  @ApiPropertyOptional({ enum: CabinClass })
  @IsOptional()
  @IsEnum(CabinClass)
  cabinClass?: CabinClass;

  @ApiPropertyOptional({ example: 100, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 1000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ enum: FlightSortBy, default: FlightSortBy.DEPARTURE_TIME })
  @IsOptional()
  @IsEnum(FlightSortBy)
  sortBy: FlightSortBy = FlightSortBy.DEPARTURE_TIME;
}
