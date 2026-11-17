import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';
import { ReportStatus, ReportTargetType } from './schemas/report.schema';

class ReportCreatedResponseDto {
  @ApiProperty({ example: '665f1e77d8e043d0b1c0a124' })
  id!: string;

  @ApiProperty({ example: '665f1e77d8e043d0b1c0a111' })
  reporterId!: string;

  @ApiProperty({ enum: ReportTargetType, example: ReportTargetType.POST })
  targetType!: ReportTargetType;

  @ApiProperty({ example: '665f1e77d8e043d0b1c0a123' })
  targetId!: string;

  @ApiProperty({ example: 'This content is inappropriate' })
  reason!: string;

  @ApiProperty({ enum: ReportStatus, example: ReportStatus.OPEN })
  status!: ReportStatus;

  @ApiProperty({ nullable: true, example: null })
  resolvedBy!: string | null;

  @ApiProperty({ nullable: true, example: null })
  resolvedAt!: Date | null;

  @ApiProperty({ example: '2026-11-17T10:00:00.000Z' })
  createdAt!: Date;
}

@ApiTags('reports')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({
    summary: 'Report a post, comment, review, or itinerary (GEN-09)',
  })
  @ApiCreatedResponse({
    description: 'Report submitted',
    type: ReportCreatedResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid target type, id, or reason' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @ApiNotFoundResponse({ description: 'Post or comment target not found' })
  @ApiConflictResponse({
    description: 'This user has already reported this item',
  })
  createReport(@CurrentUser() user: JwtUser, @Body() dto: CreateReportDto) {
    return this.reportsService.createReport(user, dto);
  }
}
