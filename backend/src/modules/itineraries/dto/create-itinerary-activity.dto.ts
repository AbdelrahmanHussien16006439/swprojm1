import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateItineraryActivityDto {
  @ApiProperty({ example: 'Visit the Egyptian Museum' })
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name is required' })
  name: string;

  @ApiProperty({ example: 'Explore the museum collection near Tahrir Square' })
  @IsString({ message: 'description must be a string' })
  @IsNotEmpty({ message: 'description is required' })
  description: string;

  @ApiPropertyOptional({ example: '09:30', description: 'Optional local time in HH:mm format' })
  @IsOptional()
  @IsString({ message: 'time must be a string' })
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/, { message: 'time must use HH:mm format' })
  time?: string;

  @ApiPropertyOptional({ example: 12.5, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'cost must be a number' })
  @Min(0, { message: 'cost must be at least 0' })
  cost?: number;

  @ApiPropertyOptional({ example: 'EGP', description: 'Required with cost; must be supported by seeded reference data' })
  @IsOptional()
  @IsString({ message: 'currency must be a string' })
  currency?: string;
}
