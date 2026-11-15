import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * ACC-01 password rule: at least 8 characters with at least one letter and one digit.
 * Reused by register, change-password, admin reset-password and moderator creation.
 */
export function IsValidPassword() {
  return applyDecorators(
    IsString({ message: '$property must be a string' }),
    MinLength(8, { message: '$property must be at least 8 characters long' }),
    MaxLength(72, { message: '$property must be at most 72 characters long' }),
    Matches(/[A-Za-z]/, {
      message: '$property must contain at least one letter',
    }),
    Matches(/\d/, { message: '$property must contain at least one digit' }),
  );
}
