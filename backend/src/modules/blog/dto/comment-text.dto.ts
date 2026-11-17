import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class CommentTextDto {
  @ApiProperty({ example: 'Thanks for sharing this itinerary!' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'text must be a string' })
  @Length(1, 500, { message: 'text must be between 1 and 500 characters' })
  text!: string;
}
