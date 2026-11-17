import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ListAuditLogsQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be a whole number' })
  @Min(1, { message: 'page must be at least 1' })
  page = 1;

  @ApiPropertyOptional({ example: '665f1e77d8e043d0b1c0a111' })
  @IsOptional()
  @IsMongoId({ message: 'actorId must be a valid MongoDB id' })
  actorId?: string;

  @ApiPropertyOptional({ example: 'CONTENT_HIDDEN', maxLength: 100 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'action must be a string' })
  @IsNotEmpty({ message: 'action must not be empty' })
  @MaxLength(100, { message: 'action must be at most 100 characters' })
  action?: string;

  @ApiPropertyOptional({
    description: 'Inclusive start of the audit entry creation date range',
    example: '2026-11-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'startDate must be a valid ISO date' },
  )
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Inclusive end of the audit entry creation date range',
    example: '2026-11-30T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'endDate must be a valid ISO date' },
  )
  endDate?: string;
}
