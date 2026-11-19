import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ListAdminBookingsQueryDto } from './dto/list-admin-bookings-query.dto';
import { AdminBookingsService } from './admin-bookings.service';

@ApiTags('admin-bookings')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/bookings')
export class AdminBookingsController {
  constructor(private readonly adminBookingsService: AdminBookingsService) {}

  @Get()
  @ApiOperation({
    summary: 'List all flight and hotel bookings (ACC-17)',
    description:
      'Read-only combined list. from/to are inclusive UTC travel dates: flight segment departure and hotel check-in.',
  })
  @ApiQuery({ name: 'type', required: false, enum: ['flight', 'hotel'] })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending_payment', 'confirmed', 'completed', 'expired', 'cancelled'],
  })
  list(@Query() query: ListAdminBookingsQueryDto) {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException('from must be on or before to');
    }
    return this.adminBookingsService.list(query);
  }
}
