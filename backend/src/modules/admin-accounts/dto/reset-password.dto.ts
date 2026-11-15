import { ApiProperty } from '@nestjs/swagger';
import { IsValidPassword } from '../../../common/validators/is-valid-password.decorator';

/** ACC-07a */
export class AdminResetPasswordDto {
  @ApiProperty({
    example: 'TempPass123',
    description: 'The user must replace it with a new password at next login',
  })
  @IsValidPassword()
  temporaryPassword: string;
}
