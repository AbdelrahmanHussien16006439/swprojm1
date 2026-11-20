import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { Role } from '../../../common/enums/role.enum';
import { trimLowerCase } from '../../../common/utils/transforms';
import { IsValidPassword } from '../../../common/validators/is-valid-password.decorator';

export const MODERATOR_ROLES = [
  Role.AIRLINE_MODERATOR,
  Role.HOTEL_MODERATOR,
] as const;
export type ModeratorRole = (typeof MODERATOR_ROLES)[number];

/** ACC-13 */
export class CreateModeratorDto {
  @ApiProperty({ example: 'Omar Khaled' })
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(100, { message: 'name must be at most 100 characters long' })
  name: string;

  @ApiProperty({ example: 'omar.moderator@example.com' })
  @Transform(trimLowerCase)
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;

  @ApiProperty({ enum: MODERATOR_ROLES, example: Role.AIRLINE_MODERATOR })
  @IsIn(MODERATOR_ROLES, {
    message: `role must be one of: ${MODERATOR_ROLES.join(', ')}`,
  })
  role: ModeratorRole;

  @ApiProperty({
    example: '665f1b2c8a1e4c3d2b1a0f99',
    description:
      'Id of the existing airline (airline_moderator) or hotel (hotel_moderator)',
  })
  @IsMongoId({ message: 'providerId must be a valid id' })
  providerId: string;

  @ApiProperty({
    example: 'TempPass123',
    description: 'Must be changed at first login',
  })
  @IsValidPassword()
  temporaryPassword: string;
}
