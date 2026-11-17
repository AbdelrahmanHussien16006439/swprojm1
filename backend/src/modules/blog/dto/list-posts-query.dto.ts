import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListPostsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'egypt' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString({ message: 'tag must be a string' })
  @IsNotEmpty({ message: 'tag must not be empty' })
  @MaxLength(30, { message: 'tag must be at most 30 characters' })
  tag?: string;

  @ApiPropertyOptional({ example: 'Cairo trip' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'q must be a string' })
  @IsNotEmpty({ message: 'q must not be empty' })
  q?: string;
}
