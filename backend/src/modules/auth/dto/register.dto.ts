import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  Equals,
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { trimLowerCase } from '../../../common/utils/transforms';
import { IsValidPassword } from '../../../common/validators/is-valid-password.decorator';

/** ACC-01. Role is always "user" — it is not accepted from the client. */
export class RegisterDto {
  @ApiProperty({ example: 'Sara Ahmed' })
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(100, { message: 'name must be at most 100 characters long' })
  name: string;

  @ApiProperty({ example: 'sara@example.com' })
  @Transform(trimLowerCase)
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;

  @ApiProperty({
    example: 'Password123',
    description: 'At least 8 characters with at least one letter and one digit',
  })
  @IsValidPassword()
  password: string;

  @ApiProperty({ example: true })
  @Equals(true, { message: 'You must accept the terms and conditions' })
  acceptTerms: boolean;
}
