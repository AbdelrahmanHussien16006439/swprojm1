import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ReferenceDataQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'Cairo',
    description: 'Search airports by IATA code, airport name, or city name/code.',
  })
  @IsOptional()
  @IsString({ message: 'search must be a string' })
  @Length(1, 100, { message: 'search must be between 1 and 100 characters' })
  search?: string;

  @ApiPropertyOptional({ example: 'cairo', description: 'Official city identifier.' })
  @IsOptional()
  @IsString({ message: 'city must be a string' })
  @Length(1, 100, { message: 'city must be between 1 and 100 characters' })
  city?: string;

  @ApiPropertyOptional({ example: 'CAI', description: 'IATA airport code.' })
  @IsOptional()
  @IsString({ message: 'iataCode must be a string' })
  @Length(1, 3, { message: 'iataCode must be between 1 and 3 characters' })
  iataCode?: string;

  @ApiPropertyOptional({ example: 'International Airport', description: 'Airport name.' })
  @IsOptional()
  @IsString({ message: 'name must be a string' })
  @Length(1, 100, { message: 'name must be between 1 and 100 characters' })
  name?: string;

  @ApiPropertyOptional({ example: 'EG', description: 'Country code or Country ObjectId.' })
  @IsOptional()
  @IsString({ message: 'countryId must be a string' })
  @Length(1, 100, { message: 'countryId must not be empty' })
  countryId?: string;
}
