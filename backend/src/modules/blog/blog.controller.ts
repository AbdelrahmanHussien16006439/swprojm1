import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { CreatePostDto } from './dto/create-post.dto';
import { CommentTextDto } from './dto/comment-text.dto';
import { ListPostsQueryDto } from './dto/list-posts-query.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { BlogService } from './blog.service';

@ApiTags('posts')
@Controller('posts')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Create a post (BLG-01)' })
  @ApiCreatedResponse({ description: 'Post created' })
  @ApiBadRequestResponse({ description: 'Invalid post fields' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  createPost(@CurrentUser() user: JwtUser, @Body() dto: CreatePostDto) {
    return this.blogService.createPost(user, dto);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Comment on a published post (BLG-05)' })
  @ApiCreatedResponse({ description: 'Comment created' })
  @ApiBadRequestResponse({ description: 'Invalid post id or comment text' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiNotFoundResponse({ description: 'Published post not found' })
  addComment(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: CommentTextDto,
  ) {
    return this.blogService.addComment(id, user, dto);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Like a published post (BLG-06)' })
  @ApiCreatedResponse({ description: 'Post liked' })
  @ApiBadRequestResponse({ description: 'Invalid post id' })
  @ApiConflictResponse({ description: 'User has already liked this post' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiNotFoundResponse({ description: 'Published post not found' })
  likePost(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.blogService.likePost(id, user.sub);
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiCookieAuth('access_token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove my like from a post (BLG-06)' })
  @ApiOkResponse({ description: 'Like removed' })
  @ApiBadRequestResponse({ description: 'Invalid post id' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiNotFoundResponse({ description: 'Post or like not found' })
  unlikePost(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.blogService.unlikePost(id, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List published posts (BLG-02, BLG-09)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'tag', required: false, type: String, example: 'egypt' })
  @ApiQuery({ name: 'q', required: false, type: String, example: 'Cairo trip' })
  @ApiOkResponse({ description: 'Paginated public posts' })
  @ApiBadRequestResponse({ description: 'Invalid pagination or search query' })
  listPublicPosts(@Query() query: ListPostsQueryDto) {
    return this.blogService.listPublicPosts(query);
  }

  // Keep /mine before /:id so it is matched as a fixed route.
  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'List my posts, including drafts (BLG-03)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiOkResponse({ description: 'Paginated posts belonging to the user' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  listMyPosts(
    @CurrentUser() user: JwtUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.blogService.listMyPosts(user.sub, query.page);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get post details and comments (BLG-02)' })
  @ApiOkResponse({ description: 'Post details' })
  @ApiBadRequestResponse({ description: 'Invalid post id' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  getPost(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() viewer?: JwtUser,
  ) {
    return this.blogService.getPost(id, viewer);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Edit my post (BLG-04, BLG-08)' })
  @ApiOkResponse({ description: 'Post updated' })
  @ApiBadRequestResponse({ description: 'Invalid post id or fields' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiNotFoundResponse({ description: 'Post not found or not owned by user' })
  updatePost(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdatePostDto,
  ) {
    return this.blogService.updatePost(id, user.sub, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiCookieAuth('access_token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete my post and associated content (BLG-04)' })
  @ApiOkResponse({
    description: 'Post, comments, likes, and image files deleted',
  })
  @ApiBadRequestResponse({ description: 'Invalid post id' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  deletePost(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.blogService.deletePost(id, user.sub);
  }
}
