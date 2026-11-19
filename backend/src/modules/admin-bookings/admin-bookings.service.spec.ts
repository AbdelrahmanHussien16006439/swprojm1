import { BadRequestException } from '@nestjs/common';
import { AdminBookingsService } from './admin-bookings.service';

function findResult<T>(items: T[] = []) {
  return {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(items),
  };
}

describe('AdminBookingsService', () => {
  const flightBookingModel = {
    find: jest.fn(() => findResult()),
    countDocuments: jest.fn(() => ({ exec: jest.fn().mockResolvedValue(0) })),
  };
  const hotelBookingModel = {
    find: jest.fn(() => findResult()),
    countDocuments: jest.fn(() => ({ exec: jest.fn().mockResolvedValue(2) })),
  };
  const flightModel = { find: jest.fn(() => findResult()) };
  const airlineModel = { find: jest.fn(() => findResult()) };
  const hotelModel = { find: jest.fn(() => findResult()) };
  const userModel = { find: jest.fn(() => findResult()) };
  let service: AdminBookingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminBookingsService(
      flightBookingModel as never,
      hotelBookingModel as never,
      flightModel as never,
      airlineModel as never,
      hotelModel as never,
      userModel as never,
    );
  });

  it('returns a paginated, filtered list using the common response shape', async () => {
    const result = await service.list({
      type: 'hotel',
      status: 'confirmed',
      page: 1,
    });

    expect(hotelBookingModel.find).toHaveBeenCalledWith({
      status: 'confirmed',
    });
    expect(hotelBookingModel.countDocuments).toHaveBeenCalledWith({
      status: 'confirmed',
    });
    expect(result).toEqual({
      data: [],
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    });
  });

  it('rejects a reversed date range', async () => {
    await expect(
      service.list({ from: '2026-12-03', to: '2026-12-01', page: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
