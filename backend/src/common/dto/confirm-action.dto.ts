import { ApiProperty } from '@nestjs/swagger';
import { Equals } from 'class-validator';

/** Body { "confirm": true } for destructive actions (GEN-14 confirmation, enforced in the backend too). */
export class ConfirmActionDto {
  @ApiProperty({ example: true })
  @Equals(true, { message: 'confirm must be true to perform this action' })
  confirm: boolean;
}
