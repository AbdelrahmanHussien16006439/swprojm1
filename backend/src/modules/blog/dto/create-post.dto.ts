import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PostStatus } from '../schemas/post.schema';

export class CreatePostDto {
  @ApiProperty({ example: 'A week in Cairo' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'title must be a string' })
  @IsNotEmpty({ message: 'title is required' })
  title!: string;

  @ApiProperty({ example: 'Here is my travel story...' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'body must be a string' })
  @IsNotEmpty({ message: 'body is required' })
  body!: string;

  @ApiPropertyOptional({ example: ['cairo', 'egypt'], maxItems: 5 })
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((tag: unknown) =>
          typeof tag === 'string' ? tag.trim().toLowerCase() : tag,
        )
      : value,
  )
  @IsArray({ message: 'tags must be an array' })
  @ArrayMaxSize(5, { message: 'tags must contain at most 5 items' })
  @IsString({ each: true, message: 'each tag must be a string' })
  @MaxLength(30, {
    each: true,
    message: 'each tag must be at most 30 characters',
  })
  tags?: string[];

  @ApiPropertyOptional({ enum: PostStatus, example: PostStatus.DRAFT })
  @IsOptional()
  @IsEnum(PostStatus, { message: 'status must be draft or published' })
  status?: PostStatus;
}
