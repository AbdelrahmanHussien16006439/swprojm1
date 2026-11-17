import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { UserStatus } from '../../common/enums/user-status.enum';
import { UsersService } from '../users/users.service';
import { BlogService } from './blog.service';
import { PUBLIC_ITINERARY_READER } from './public-itinerary-reader';
import type { PublicItineraryReader } from './public-itinerary-reader';

@ApiTags('authors')
@Controller('authors')
export class AuthorsController {
  constructor(
    private readonly usersService: UsersService,
    private readonly blogService: BlogService,
    @Inject(PUBLIC_ITINERARY_READER)
    private readonly itineraryReader: PublicItineraryReader,
  ) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Get a public author profile (BLG-12)',
    description:
      'Posts use public visibility rules and pagination. itineraries is null until M7 provides its public author query.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiOkResponse({
    description:
      'Public profile, paginated published posts, and pending itinerary integration (null)',
  })
  @ApiBadRequestResponse({ description: 'Invalid author id or page' })
  @ApiNotFoundResponse({ description: 'Author not found' })
  async getAuthorProfile(
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    const author = await this.usersService.findPublicProfile(id);
    const posts = await this.blogService.listPublicPostsByAuthor(
      id,
      query.page ?? 1,
    );
    const itineraries =
      author.status === UserStatus.DEACTIVATED
        ? null
        : await this.itineraryReader.listPublicByAuthor(id, query.page ?? 1);

    return {
      author: {
        id: author.id,
        name: author.name,
        joinedAt: author.joinedAt,
      },
      posts,
      itineraries,
    };
  }
}
