import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsPositive, Min } from 'class-validator';

export class UpdateBaggagePolicyDto {
  @ApiProperty({ example: 25, description: 'Price charged for each extra bag' })
  @IsNumber()
  @IsPositive()
  extraBagPrice: number;

  @ApiProperty({ example: 2, description: 'Maximum extra bags per passenger' })
  @IsInt()
  @Min(0)
  maxExtraBagsPerPassenger: number;
}
