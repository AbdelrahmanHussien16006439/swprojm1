import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetContentHiddenDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  hidden: boolean;
}
