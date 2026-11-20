import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { AcceptPoliciesDto } from './dto/accept-policies.dto';
import { CancelFlightBookingDto } from './dto/cancel-flight-booking.dto';
import { MyBookingsQueryDto } from './dto/my-bookings-query.dto';
import { ModeratorBookingsQueryDto } from './dto/my-bookings-query.dto';
import { FlightBookingsService } from './flight-bookings.service';
import { BadRequestException } from '@nestjs/common';
import { HotelBookingsService } from '../hotel-bookings/hotel-bookings.service';

@ApiTags('flight-bookings')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard)
@Controller('flight-bookings')
export class FlightBookingsController {
  constructor(private readonly flightBookingsService: FlightBookingsService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'group', required: false, enum: ['upcoming', 'past', 'cancelled'] })
  @ApiOperation({ summary: 'List the logged-in user’s flight bookings' })
  myBookings(@Query() query: MyBookingsQueryDto, @CurrentUser() user: JwtUser) {
    return this.flightBookingsService.findMine(user.sub, query.page ?? 1, query.group);
  }

  @Get(':id/refund-preview')
  @ApiOperation({ summary: 'Preview the refund for a confirmed flight booking' })
  refundPreview(
    @Param('id', ParseObjectIdPipe) bookingId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.flightBookingsService.getRefundPreview(bookingId, user.sub);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a confirmed flight booking before departure' })
  cancel(
    @Param('id', ParseObjectIdPipe) bookingId: string,
    @Body() dto: CancelFlightBookingDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.flightBookingsService.cancelBooking(bookingId, user.sub, dto.confirm);
  }

  @Get(':id/e-ticket')
  @ApiProduces('application/pdf')
  @ApiOperation({ summary: 'Download the confirmed flight booking e-ticket PDF' })
  async eTicket(
    @Param('id', ParseObjectIdPipe) bookingId: string,
    @CurrentUser() user: JwtUser,
    @Res() response: Response,
  ): Promise<void> {
    const ticket = await this.flightBookingsService.generateETicketPdf(
      bookingId,
      user.sub,
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${ticket.filename}"`,
    );
    response.end(ticket.buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full details of an owned flight booking' })
  details(
    @Param('id', ParseObjectIdPipe) bookingId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.flightBookingsService.getMine(bookingId, user.sub);
  }
}

@ApiTags('bookings')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard)
@Controller('bookings/:type/:id')
export class BookingPoliciesController {
  constructor(
    private readonly flightBookingsService: FlightBookingsService,
    private readonly hotelBookingsService: HotelBookingsService,
  ) {}

  @Get('policies')
  @ApiOperation({ summary: 'Get policies for an owned pending booking' })
  getPolicies(
    @Param('type') type: string,
    @Param('id', ParseObjectIdPipe) bookingId: string,
    @CurrentUser() user: JwtUser,
  ) {
    this.assertBookingType(type);
    return type === 'hotel'
      ? this.hotelBookingsService.getPolicies(bookingId, user.sub)
      : this.flightBookingsService.getPolicies(bookingId, user.sub);
  }

  @Post('accept-policies')
  @ApiOperation({ summary: 'Accept and snapshot policies for an owned pending booking' })
  acceptPolicies(
    @Param('type') type: string,
    @Param('id', ParseObjectIdPipe) bookingId: string,
    @Body() dto: AcceptPoliciesDto,
    @CurrentUser() user: JwtUser,
  ) {
    this.assertBookingType(type);
    if (dto.accepted !== true) {
      throw new BadRequestException('Policies must be accepted before payment');
    }
    return type === 'hotel'
      ? this.hotelBookingsService.acceptPolicies(bookingId, user.sub)
      : this.flightBookingsService.acceptPolicies(bookingId, user.sub);
  }

  private assertBookingType(type: string): void {
    if (type === 'hotel') {
      return;
    }
    if (type !== 'flight') {
      throw new BadRequestException('Booking type must be flight or hotel');
    }
  }
}

@ApiTags('flights')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AIRLINE_MODERATOR)
@Controller('flights')
export class FlightModeratorBookingsController {
  constructor(private readonly flightBookingsService: FlightBookingsService) {}

  @Get(':id/bookings')
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiOperation({ summary: 'List bookings and cabin inventory for my flight (FLT-29)' })
  bookings(
    @Param('id', ParseObjectIdPipe) flightId: string,
    @Query() query: ModeratorBookingsQueryDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.flightBookingsService.listFlightBookingsForModerator(
      flightId,
      user.providerId,
      query.page ?? 1,
    );
  }

  @Get(':id/passengers/export')
  @ApiProduces('text/csv')
  @ApiOperation({ summary: 'Download my flight passenger list as CSV (FLT-29)' })
  async exportPassengers(
    @Param('id', ParseObjectIdPipe) flightId: string,
    @CurrentUser() user: JwtUser,
    @Res() response: Response,
  ): Promise<void> {
    const csv = await this.flightBookingsService.exportFlightPassengersCsv(
      flightId,
      user.providerId,
    );
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="flight-${flightId}-passengers.csv"`,
    );
    response.end(csv);
  }
}
