import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { CreateBookingSummaryDto } from './dto/create-booking-summary.dto';
import { FlightBookingsService } from './flight-bookings.service';

@ApiTags('flight-bookings')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard)
@Controller('flight-bookings')
export class FlightBookingSummaryController {
  constructor(private readonly flightBookingsService: FlightBookingsService) {}

  @Post()
  @ApiOperation({
    summary: 'Calculate a flight booking summary without holding seats',
  })
  createSummary(@Body() dto: CreateBookingSummaryDto, @CurrentUser() _user: JwtUser) {
    return this.flightBookingsService.createSummary(dto);
  }
}
