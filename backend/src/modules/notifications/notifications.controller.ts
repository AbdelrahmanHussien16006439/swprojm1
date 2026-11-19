import {
  Controller,
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
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List your newest notifications and unread count' })
  list(
    @CurrentUser() user: JwtUser,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.listForUser(user.sub, query);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all your notifications as read' })
  markAllRead(@CurrentUser() user: JwtUser) {
    return this.notificationsService.markAllRead(user.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one of your notifications as read' })
  @ApiParam({ name: 'id', example: '665f1d4a2a8c7b4e5f123456' })
  markRead(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.notificationsService.markRead(id, user.sub);
  }
}
