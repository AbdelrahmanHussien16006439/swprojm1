import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { FlightsService } from '../flights/flights.service';
import { HotelsService } from '../hotels/hotels.service';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { UploadsService } from '../uploads/uploads.service';
import { UsersService } from '../users/users.service';
import { ItinerariesService } from './itineraries.service';

describe('ItinerariesService flight search (ITN-26)', () => {
  const user = {
    sub: new Types.ObjectId().toString(),
    sid: 'session',
    email: 'traveler@example.com',
    role: Role.USER,
  } as JwtUser;
  const cityId = new Types.ObjectId();
  const destinationAirportId = new Types.ObjectId();
  const originAirportId = new Types.ObjectId();
  let service: ItinerariesService;
  let itineraryModel: any;
  let referenceData: jest.Mocked<Pick<ReferenceDataService, 'findCity' | 'findAirportsByCity' | 'findAirport'>>;
  let flightsService: jest.Mocked<Pick<FlightsService, 'search'>>;
  let itinerary: any;

  beforeEach(() => {
    itinerary = {
      startDate: new Date('2026-12-01T00:00:00.000Z'),
      days: [
        { cityId },
        { cityId: new Types.ObjectId() },
        { cityId: new Types.ObjectId() },
      ],
    };
    itineraryModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(itinerary) }),
    };
    referenceData = {
      findCity: jest.fn().mockResolvedValue({ _id: cityId }),
      findAirportsByCity: jest.fn().mockResolvedValue([{ _id: destinationAirportId }]),
      findAirport: jest.fn().mockResolvedValue({ _id: originAirportId }),
    };
    flightsService = { search: jest.fn().mockResolvedValue({ outbound: [], return: [] }) };
    service = new ItinerariesService(
      itineraryModel,
      referenceData as ReferenceDataService,
      {} as UploadsService,
      {} as ExchangeRatesService,
      {} as UsersService,
      {} as HotelsService,
      flightsService as FlightsService,
    );
  });

  it('derives the destination and default one-way date and forwards passenger counts', async () => {
    await service.searchFlightsForItinerary(
      'itinerary-id',
      { originAirportId: originAirportId.toString(), tripType: 'one_way', adults: 2, children: 1, infants: 1 } as any,
      user,
    );

    expect(itineraryModel.findOne).toHaveBeenCalledWith({
      _id: 'itinerary-id',
      ownerId: new Types.ObjectId(user.sub),
    });
    expect(referenceData.findAirportsByCity).toHaveBeenCalledWith(cityId.toString());
    expect(flightsService.search).toHaveBeenCalledWith(expect.objectContaining({
      fromAirportId: originAirportId.toString(),
      toAirportIds: [destinationAirportId.toString()],
      departDate: '2026-12-01',
      returnDate: undefined,
      adults: 2,
      children: 1,
      infants: 1,
    }));
  });

  it('defaults a round-trip return date to the date of the last itinerary day', async () => {
    await service.searchFlightsForItinerary(
      'itinerary-id',
      { originAirportId: originAirportId.toString(), tripType: 'round_trip' } as any,
      user,
    );
    expect(flightsService.search).toHaveBeenCalledWith(expect.objectContaining({
      departDate: '2026-12-01',
      returnDate: '2026-12-03',
    }));
  });

  it('rejects itineraries without days', async () => {
    itinerary.days = [];
    await expect(service.searchFlightsForItinerary(
      'itinerary-id',
      { originAirportId: originAirportId.toString(), tripType: 'one_way' } as any,
      user,
    )).rejects.toThrow(BadRequestException);
    expect(flightsService.search).not.toHaveBeenCalled();
  });
});
