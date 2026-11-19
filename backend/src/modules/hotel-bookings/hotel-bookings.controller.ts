import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
import { CreateHotelBookingDto } from './dto/create-hotel-booking.dto';
import { CancelHotelBookingDto } from './dto/cancel-hotel-booking.dto';
import { MyHotelBookingsQueryDto } from './dto/my-hotel-bookings-query.dto';
import { HotelBookingsService } from './hotel-bookings.service';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';

@ApiTags('hotel-bookings')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER)
@Controller('hotel-bookings')
export class HotelBookingsController {
  constructor(private readonly hotelBookingsService: HotelBookingsService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({
    name: 'group',
    required: false,
    enum: ['upcoming', 'past', 'cancelled'],
  })
  @ApiOperation({ summary: 'List your hotel reservations' })
  findMine(
    @Query() query: MyHotelBookingsQueryDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.hotelBookingsService.findMine(user.sub, query);
  }

  @Get(':id')
  @ApiParam({ name: 'id', example: '665f1d4a2a8c7b4e5f123456' })
  @ApiOperation({ summary: 'Get full details for one of your hotel bookings' })
  getMine(
    @Param('id', ParseObjectIdPipe) bookingId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.hotelBookingsService.getMine(bookingId, user.sub);
  }

  @Get(':id/refund-preview')
  @ApiParam({ name: 'id', example: '665f1d4a2a8c7b4e5f123456' })
  @ApiOperation({ summary: 'Preview the refund for a confirmed hotel booking' })
  refundPreview(
    @Param('id', ParseObjectIdPipe) bookingId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.hotelBookingsService.getRefundPreview(bookingId, user.sub);
  }

  @Post(':id/cancel')
  @ApiParam({ name: 'id', example: '665f1d4a2a8c7b4e5f123456' })
  @ApiOperation({ summary: 'Cancel a confirmed hotel booking before check-in' })
  cancel(
    @Param('id', ParseObjectIdPipe) bookingId: string,
    @Body() dto: CancelHotelBookingDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.hotelBookingsService.cancelBooking(
      bookingId,
      user.sub,
      dto.confirm,
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Hold one or more hotel rooms and proceed to payment',
  })
  create(@Body() dto: CreateHotelBookingDto, @CurrentUser() user: JwtUser) {
    return this.hotelBookingsService.createHold(dto, user.sub);
  }
}
