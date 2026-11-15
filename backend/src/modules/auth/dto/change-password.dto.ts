import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsValidPassword } from '../../../common/validators/is-valid-password.decorator';

/** ACC-08: new password must follow the ACC-01 rules. */
export class ChangePasswordDto {
  @ApiProperty({ example: 'Password123' })
  @IsString({ message: 'currentPassword must be a string' })
  @IsNotEmpty({ message: 'currentPassword is required' })
  currentPassword: string;

  @ApiProperty({
    example: 'NewPassword456',
    description: 'At least 8 characters with at least one letter and one digit',
  })
  @IsValidPassword()
  newPassword: string;
}
