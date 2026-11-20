import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { ListHotelReviewsQueryDto } from './dto/list-hotel-reviews-query.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('hotels/:id/reviews')
  @ApiParam({ name: 'id', example: '665f1d4a2a8c7b4e5f123456' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiOperation({ summary: 'List public reviews and rating for a hotel' })
  listForHotel(
    @Param('id', ParseObjectIdPipe) hotelId: string,
    @Query() query: ListHotelReviewsQueryDto,
  ) {
    return this.reviewsService.listForHotel(hotelId, query);
  }

  @Patch('reviews/:id')
  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiParam({ name: 'id', example: '665f1d4a2a8c7b4e5f123456' })
  @ApiOperation({ summary: 'Edit your own hotel review' })
  update(
    @Param('id', ParseObjectIdPipe) reviewId: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.reviewsService.update(reviewId, user.sub, dto);
  }

  @Delete('reviews/:id')
  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiParam({ name: 'id', example: '665f1d4a2a8c7b4e5f123456' })
  @ApiOperation({ summary: 'Delete your own hotel review' })
  remove(
    @Param('id', ParseObjectIdPipe) reviewId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.reviewsService.remove(reviewId, user.sub);
  }
}
