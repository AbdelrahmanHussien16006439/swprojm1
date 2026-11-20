import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class RetryPaymentDto {
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
