import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ enum: ['flight', 'hotel'], example: 'flight' })
  @IsIn(['flight', 'hotel'], { message: 'bookingType must be flight or hotel' })
  bookingType: 'flight' | 'hotel';

  @ApiProperty({ example: '665f1c2a6d3b4c5e7f8a9012' })
  @Matches(/^[a-f\d]{24}$/i, { message: 'bookingId must be a valid ObjectId' })
  bookingId: string;

  @ApiPropertyOptional({
    example: 'pm_card_visa',
    description: 'Stripe test payment method for Swagger testing; never stored.',
  })
  @IsOptional()
  @Matches(/^pm_[A-Za-z0-9_]+$/, {
    message: 'testPaymentMethod must be a Stripe payment method id',
  })
  testPaymentMethod?: string;
}
