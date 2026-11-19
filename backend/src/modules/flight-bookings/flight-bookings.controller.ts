import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotImplementedException,
  Param,
  Post,
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
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { AcceptPoliciesDto } from './dto/accept-policies.dto';
import { FlightBookingsService } from './flight-bookings.service';

@ApiTags('bookings')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard)
@Controller('bookings/:type/:id')
export class BookingPoliciesController {
  constructor(private readonly flightBookingsService: FlightBookingsService) {}

  @Get('policies')
  @ApiParam({ name: 'type', enum: ['flight', 'hotel'] })
  @ApiOperation({ summary: 'Get policies for an owned pending booking' })
  getPolicies(
    @Param('type') type: string,
    @Param('id', ParseObjectIdPipe) bookingId: string,
    @CurrentUser() user: JwtUser,
  ) {
    this.assertBookingType(type);
    return this.flightBookingsService.getPolicies(bookingId, user.sub);
  }

  @Post('accept-policies')
  @ApiParam({ name: 'type', enum: ['flight', 'hotel'] })
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
    return this.flightBookingsService.acceptPolicies(bookingId, user.sub);
  }

  private assertBookingType(type: string): void {
    if (type === 'hotel') {
      throw new NotImplementedException('Hotel booking policies are not available yet');
    }
    if (type !== 'flight') {
      throw new BadRequestException('Booking type must be flight or hotel');
    }
  }
}
