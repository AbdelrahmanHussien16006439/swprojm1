import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { CreateHotelBookingDto } from './dto/create-hotel-booking.dto';
import { HotelBookingsService } from './hotel-bookings.service';

@ApiTags('hotel-bookings')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER)
@Controller('hotel-bookings')
export class HotelBookingsController {
  constructor(private readonly hotelBookingsService: HotelBookingsService) {}

  @Post()
  @ApiOperation({
    summary: 'Hold one or more hotel rooms and proceed to payment',
  })
  create(@Body() dto: CreateHotelBookingDto, @CurrentUser() user: JwtUser) {
    return this.hotelBookingsService.createHold(dto, user.sub);
  }
}
