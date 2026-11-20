import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
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
import { ListReportsQueryDto } from './dto/list-reports-query.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { SetContentHiddenDto } from './dto/set-content-hidden.dto';
import {
  AdminModerationService,
  ModeratedContentType,
} from './admin-moderation.service';

@ApiTags('admin moderation')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Login required' })
@ApiForbiddenResponse({ description: 'Admin role required' })
export class AdminModerationController {
  constructor(private readonly moderationService: AdminModerationService) {}

  @Get('reports')
  @ApiOperation({ summary: 'List reports with filters (GEN-10)' })
  @ApiOkResponse({ description: 'Paginated reports' })
  @ApiBadRequestResponse({ description: 'Invalid query filters' })
  listReports(@Query() query: ListReportsQueryDto) {
    return this.moderationService.listReports(query);
  }

  @Patch('reports/:id')
  @ApiOperation({ summary: 'Resolve a report (GEN-10)' })
  @ApiOkResponse({ description: 'Report resolved and action audited' })
  @ApiBadRequestResponse({ description: 'Invalid report id or action' })
  @ApiNotFoundResponse({ description: 'Report or target not found' })
  resolveReport(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() admin: JwtUser,
    @Body() dto: ResolveReportDto,
  ) {
    return this.moderationService.resolveReport(id, admin.sub, dto.action);
  }

  @Patch('content/:type/:id/hide')
  @ApiParam({ name: 'type', enum: ModeratedContentType })
  @ApiOperation({ summary: 'Hide or restore content (GEN-10)' })
  @ApiOkResponse({ description: 'Visibility changed and action audited' })
  @ApiBadRequestResponse({ description: 'Invalid content type or id' })
  @ApiNotFoundResponse({ description: 'Content not found' })
  setContentHidden(
    @Param('type', new ParseEnumPipe(ModeratedContentType))
    type: ModeratedContentType,
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() admin: JwtUser,
    @Body() dto: SetContentHiddenDto,
  ) {
    return this.moderationService.setContentHidden(
      type,
      id,
      admin.sub,
      dto.hidden,
    );
  }

  @Delete('content/:type/:id')
  @ApiParam({ name: 'type', enum: ModeratedContentType })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete content (GEN-10)' })
  @ApiOkResponse({ description: 'Content deleted and action audited' })
  @ApiBadRequestResponse({ description: 'Invalid content type or id' })
  @ApiNotFoundResponse({ description: 'Content not found' })
  deleteContent(
    @Param('type', new ParseEnumPipe(ModeratedContentType))
    type: ModeratedContentType,
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() admin: JwtUser,
  ) {
    return this.moderationService.deleteContent(type, id, admin.sub);
  }
}
