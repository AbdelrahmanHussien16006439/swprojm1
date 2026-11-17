import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class TagPostsParamsDto {
  @ApiProperty({ example: 'egypt', maxLength: 30 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString({ message: 'tag must be a string' })
  @IsNotEmpty({ message: 'tag must not be empty' })
  @MaxLength(30, { message: 'tag must be at most 30 characters' })
  tag!: string;
}
