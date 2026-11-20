import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateHotelDto {
  @ApiProperty({ example: 'Nile View Hotel' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name is required' })
  name: string;

  @ApiProperty({ example: '12 Corniche El Nile, Cairo' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'address must be a string' })
  @IsNotEmpty({ message: 'address is required' })
  address: string;

  @ApiProperty({ example: 'cairo', description: 'Official city id or City ObjectId.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'cityId must be a string' })
  @IsNotEmpty({ message: 'cityId is required' })
  cityId: string;

  @ApiProperty({ example: 'EG', description: 'Official country code or Country ObjectId.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'countryId must be a string' })
  @IsNotEmpty({ message: 'countryId is required' })
  countryId: string;

  @ApiProperty({ example: 'A hotel overlooking the Nile in central Cairo.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'description must be a string' })
  @IsNotEmpty({ message: 'description is required' })
  description: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt({ message: 'stars must be a whole number' })
  @Min(1, { message: 'stars must be at least 1' })
  @Max(5, { message: 'stars must be at most 5' })
  stars: number;

  @ApiProperty({ example: ['Wi-Fi', 'Pool', 'Restaurant'], type: [String] })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((amenity) => (typeof amenity === 'string' ? amenity.trim() : amenity))
      : value,
  )
  @IsArray({ message: 'amenities must be an array' })
  @IsString({ each: true, message: 'each amenity must be a string' })
  amenities: string[];
}
