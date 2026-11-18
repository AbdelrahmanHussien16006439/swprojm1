import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsPositive, Min } from 'class-validator';
import { CabinClass } from '../flights.constants';

export class CreateCabinDto {
  @ApiProperty({ enum: CabinClass, example: CabinClass.ECONOMY })
  @IsEnum(CabinClass)
  cabinClass: CabinClass;

  @ApiProperty({ example: 250 })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ example: 180 })
  @IsInt()
  @IsPositive()
  totalSeats: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  freeBags: number;

  @ApiProperty({ example: 23 })
  @IsNumber()
  @IsPositive()
  maxBagWeightKg: number;
}
