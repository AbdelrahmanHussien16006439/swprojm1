import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePostDto } from './create-post.dto';

/** PATCH edits only title, body, status, and tags; images use the separate image task. */
export class UpdatePostDto extends PartialType(
  OmitType(CreatePostDto, ['images'] as const),
) {}
