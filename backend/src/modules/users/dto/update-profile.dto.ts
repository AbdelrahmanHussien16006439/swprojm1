import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { trimUpperCase } from '../../../common/utils/transforms';

/** ACC-09: all provided fields must be valid, otherwise nothing is saved. */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Sara Ahmed' })
  @IsOptional()
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name must not be empty' })
  @MaxLength(100, { message: 'name must be at most 100 characters long' })
  name?: string;

  @ApiPropertyOptional({ example: '+201001234567' })
  @IsOptional()
  @Matches(/^\+?[0-9][0-9\s-]{6,19}$/, {
    message:
      'phone must be a valid phone number (digits, optional leading +, 7–20 characters)',
  })
  phone?: string;

  @ApiPropertyOptional({
    example: 'EUR',
    description: 'ISO 4217 code of a supported currency',
  })
  @IsOptional()
  @Transform(trimUpperCase)
  @Matches(/^[A-Z]{3}$/, {
    message: 'preferredCurrency must be a 3-letter currency code (e.g. USD)',
  })
  preferredCurrency?: string;
}
