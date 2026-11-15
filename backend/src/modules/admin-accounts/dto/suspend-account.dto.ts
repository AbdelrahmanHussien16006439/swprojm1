import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** ACC-15, ACC-16: optional reason, stored in the audit log. */
export class SuspendAccountDto {
  @ApiPropertyOptional({ example: 'Repeated abusive comments' })
  @IsOptional()
  @IsString({ message: 'reason must be a string' })
  @MaxLength(500, { message: 'reason must be at most 500 characters long' })
  reason?: string;
}
