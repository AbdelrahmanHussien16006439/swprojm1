import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class PublicItinerariesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'Cairo' })
  @IsOptional()
  @IsString({ message: 'q must be a string' })
  q?: string;

  @ApiPropertyOptional({ example: 3, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'minDays must be a whole number' })
  @Min(0, { message: 'minDays must be at least 0' })
  minDays?: number;

  @ApiPropertyOptional({ example: 14, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'maxDays must be a whole number' })
  @Min(0, { message: 'maxDays must be at least 0' })
  maxDays?: number;

  @ApiPropertyOptional({ example: 'EG', description: 'Seeded country code or MongoDB ID' })
  @IsOptional()
  @IsString({ message: 'countryId must be a string' })
  @IsNotEmpty({ message: 'countryId cannot be empty' })
  countryId?: string;

  @ApiPropertyOptional({ example: 'cairo', description: 'Seeded city ID or MongoDB ID' })
  @IsOptional()
  @IsString({ message: 'cityId must be a string' })
  @IsNotEmpty({ message: 'cityId cannot be empty' })
  cityId?: string;
}
