import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { BlogService } from './blog.service';
import { CommentTextDto } from './dto/comment-text.dto';

@ApiTags('comments')
@Controller('comments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER)
@ApiCookieAuth('access_token')
export class CommentsController {
  constructor(private readonly blogService: BlogService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Edit my comment (BLG-07)' })
  @ApiOkResponse({ description: 'Comment updated' })
  @ApiBadRequestResponse({ description: 'Invalid comment id or text' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiNotFoundResponse({
    description: 'Comment not found or not owned by user',
  })
  updateComment(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: CommentTextDto,
  ) {
    return this.blogService.updateComment(id, user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete my comment (BLG-07)' })
  @ApiOkResponse({ description: 'Comment deleted' })
  @ApiBadRequestResponse({ description: 'Invalid comment id' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiNotFoundResponse({
    description: 'Comment not found or not owned by user',
  })
  deleteComment(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.blogService.deleteComment(id, user.sub);
  }
}
