import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { BlogService } from './blog.service';
import { TagPostsParamsDto } from './dto/tag-posts-params.dto';

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly blogService: BlogService) {}

  @Get(':tag/posts')
  @ApiOperation({ summary: 'List published posts for a tag (BLG-08)' })
  @ApiParam({ name: 'tag', example: 'egypt', description: 'Post tag' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiOkResponse({ description: 'Paginated public posts with this tag' })
  @ApiBadRequestResponse({ description: 'Invalid tag or page' })
  listTagPosts(
    @Param() params: TagPostsParamsDto,
    @Query() query: PaginationQueryDto,
  ) {
    return this.blogService.listPostsByTag(params.tag, query.page);
  }
}
