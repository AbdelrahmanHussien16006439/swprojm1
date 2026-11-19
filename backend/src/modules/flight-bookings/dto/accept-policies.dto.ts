import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsBoolean } from 'class-validator';

export class AcceptPoliciesDto {
  @ApiProperty({ example: true, description: 'Must be true to accept the displayed policies.' })
  @IsBoolean({ message: 'accepted must be a boolean' })
  @Equals(true, { message: 'accepted must be true' })
  accepted: true;
}
