import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsBoolean } from 'class-validator';

export class CancelHotelBookingDto {
  @ApiProperty({
    example: true,
    description: 'Must be true to confirm cancellation.',
  })
  @IsBoolean({ message: 'confirm must be a boolean' })
  @Equals(true, { message: 'confirm must be true' })
  confirm: true;
}
