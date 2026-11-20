import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsMongoId, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { CabinClass } from '../flights.constants';

export enum FlightSortBy {
  PRICE = 'price',
  DURATION = 'duration',
  DEPARTURE_TIME = 'departureTime',
}

export class SearchFlightsDto {
  @ApiPropertyOptional({ example: '665f1c2a6d3b4c5e7f8a9012' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-f\d]{24}$/i, { message: 'fromAirportId must be a valid ObjectId' })
  fromAirportId?: string;

  @ApiPropertyOptional({ example: '665f1c2a6d3b4c5e7f8a9013', type: [String] })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === ''
      ? undefined
      : Array.isArray(value)
        ? value
        : String(value).split(','),
  )
  @IsMongoId({ each: true })
  toAirportIds?: string[];

  @ApiPropertyOptional({ example: '2027-06-15' })
  @IsOptional()
  @IsDateString({}, { message: 'departDate must be a valid ISO date' })
  departDate?: string;

  @ApiPropertyOptional({ example: '2027-06-22' })
  @IsOptional()
  @IsDateString({}, { message: 'returnDate must be a valid ISO date' })
  returnDate?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  adults = 1;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  children = 0;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  infants = 0;

  @ApiPropertyOptional({ enum: CabinClass })
  @IsOptional()
  @IsEnum(CabinClass)
  cabinClass?: CabinClass;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ enum: FlightSortBy, default: FlightSortBy.DEPARTURE_TIME })
  @IsOptional()
  @IsEnum(FlightSortBy)
  sortBy: FlightSortBy = FlightSortBy.DEPARTURE_TIME;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
}
