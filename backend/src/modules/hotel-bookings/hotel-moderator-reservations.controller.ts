import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
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
import { HotelModeratorReservationsQueryDto } from './dto/hotel-moderator-reservations-query.dto';
import { HotelBookingsService } from './hotel-bookings.service';

@ApiTags('hotel-bookings')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.HOTEL_MODERATOR)
@Controller('hotels')
export class HotelModeratorReservationsController {
  constructor(private readonly hotelBookingsService: HotelBookingsService) {}

  @Get(':id/reservations')
  @ApiParam({ name: 'id', example: '665f1d4a2a8c7b4e5f123456' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending_payment', 'confirmed', 'completed', 'expired', 'cancelled'],
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    example: '2026-12-01',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    example: '2026-12-31',
  })
  @ApiOperation({ summary: 'List reservations for your hotel' })
  findForHotel(
    @Param('id', ParseObjectIdPipe) hotelId: string,
    @Query() query: HotelModeratorReservationsQueryDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.hotelBookingsService.findForModerator(hotelId, user, query);
  }
}
