import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAirlineDto {
  @ApiProperty({ example: 'Cairo Air' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'CA' })
  @IsString()
  @IsNotEmpty()
  code: string;
}
