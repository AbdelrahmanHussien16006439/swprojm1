import { BookingPoliciesController } from './flight-bookings.controller';
import { FlightBookingsService } from './flight-bookings.service';
import { HotelBookingsService } from '../hotel-bookings/hotel-bookings.service';

describe('BookingPoliciesController integration dispatch', () => {
  let controller: BookingPoliciesController;
  let flightBookingsService: {
    getPolicies: jest.Mock;
    acceptPolicies: jest.Mock;
  };
  let hotelBookingsService: {
    getPolicies: jest.Mock;
    acceptPolicies: jest.Mock;
  };

  beforeEach(() => {
    flightBookingsService = {
      getPolicies: jest.fn().mockResolvedValue({ bookingType: 'flight' }),
      acceptPolicies: jest.fn().mockResolvedValue({ status: 'pending_payment' }),
    };
    hotelBookingsService = {
      getPolicies: jest.fn().mockResolvedValue({ bookingType: 'hotel' }),
      acceptPolicies: jest.fn().mockResolvedValue({ status: 'pending_payment' }),
    };
    controller = new BookingPoliciesController(
      flightBookingsService as unknown as FlightBookingsService,
      hotelBookingsService as unknown as HotelBookingsService,
    );
  });

  it('routes policy reads to the booking type owner', async () => {
    const user = { sub: 'owner-id' } as never;

    await expect(controller.getPolicies('hotel', 'hotel-booking', user)).resolves.toEqual({
      bookingType: 'hotel',
    });
    await expect(controller.getPolicies('flight', 'flight-booking', user)).resolves.toEqual({
      bookingType: 'flight',
    });
    expect(hotelBookingsService.getPolicies).toHaveBeenCalledWith('hotel-booking', 'owner-id');
    expect(flightBookingsService.getPolicies).toHaveBeenCalledWith('flight-booking', 'owner-id');
  });

  it('routes policy acceptance to the booking type owner', async () => {
    const user = { sub: 'owner-id' } as never;
    const accepted = { accepted: true } as never;

    await controller.acceptPolicies('hotel', 'hotel-booking', accepted, user);
    await controller.acceptPolicies('flight', 'flight-booking', accepted, user);

    expect(hotelBookingsService.acceptPolicies).toHaveBeenCalledWith('hotel-booking', 'owner-id');
    expect(flightBookingsService.acceptPolicies).toHaveBeenCalledWith('flight-booking', 'owner-id');
  });
});
