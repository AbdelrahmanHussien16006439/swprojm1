import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNumber,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CancellationTierDto {
  @ApiProperty({ example: 30, description: 'Days before departure' })
  @IsInt()
  @Min(0)
  daysBefore: number;

  @ApiProperty({ example: 75, description: 'Refund percentage' })
  @IsNumber()
  @Min(0)
  @Max(100)
  refundPercent: number;
}

export class UpdateCancellationPolicyDto {
  @ApiProperty({
    type: [CancellationTierDto],
    example: [
      { daysBefore: 30, refundPercent: 75 },
      { daysBefore: 7, refundPercent: 25 },
      { daysBefore: 0, refundPercent: 0 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CancellationTierDto)
  @ArrayUnique((tier: CancellationTierDto) => tier.daysBefore)
  tiers: CancellationTierDto[];
}
