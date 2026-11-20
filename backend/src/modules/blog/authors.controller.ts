import { Controller, Get, Param, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
import { Itinerary } from '../itineraries/schemas/itinerary.schema';
import { paginate } from '../../common/utils/pagination';
import { BlogService } from './blog.service';

@ApiTags('authors')
@Controller('authors')
export class AuthorsController {
  constructor(
    private readonly usersService: UsersService,
    private readonly blogService: BlogService,
    @InjectModel(Itinerary.name)
    private readonly itineraryModel: Model<Itinerary>,
  ) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Get a public author profile (BLG-12)',
    description:
      'Returns the author’s published posts and public, non-hidden itineraries.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiOkResponse({
    description:
      'Public profile, paginated published posts and public itineraries',
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
    const itineraries = author.status === UserStatus.DEACTIVATED
      ? null
      : await this.listPublicItineraries(id, query.page ?? 1);

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

  private async listPublicItineraries(authorId: string, page: number) {
    const result = await paginate(
      this.itineraryModel,
      {
        ownerId: new Types.ObjectId(authorId),
        isPublic: true,
        isHidden: false,
      },
      page,
      { sort: { updatedAt: -1, _id: -1 } },
    );
    return {
      ...result,
      data: result.data.map((itinerary) => ({
        id: itinerary._id.toString(),
        title: itinerary.title,
        startDate: itinerary.startDate,
        days: itinerary.days.length,
      })),
    };
  }
}
