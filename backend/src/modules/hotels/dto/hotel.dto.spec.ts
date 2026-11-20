import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateHotelDto } from './create-hotel.dto';
import { UpdateHotelDto } from './update-hotel.dto';
import { UpdateHotelPoliciesDto } from './update-hotel-policies.dto';

describe('Hotel request DTOs', () => {
  it('accepts a hotel using the official reference identifiers', async () => {
    const dto = plainToInstance(CreateHotelDto, {
      name: 'Nile View Hotel',
      address: '12 Corniche El Nile, Cairo',
      cityId: 'cairo',
      countryId: 'EG',
      description: 'A hotel on the Nile.',
      stars: 5,
      amenities: ['Wi-Fi', 'Pool'],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects an invalid star class', async () => {
    const dto = plainToInstance(CreateHotelDto, {
      name: 'Nile View Hotel',
      address: '12 Corniche El Nile, Cairo',
      cityId: 'cairo',
      countryId: 'EG',
      description: 'A hotel on the Nile.',
      stars: 6,
      amenities: [],
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toContain('stars');
  });

  it('allows a partial hotel patch without optional check-in/out fields', async () => {
    const dto = plainToInstance(UpdateHotelDto, { name: 'Renamed hotel' });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects duplicate cancellation thresholds and invalid time formats', async () => {
    const dto = plainToInstance(UpdateHotelPoliciesDto, {
      checkInTime: '25:00',
      checkOutTime: '11:00',
      tiers: [
        { daysBefore: 7, refundPercent: 50 },
        { daysBefore: 7, refundPercent: 25 },
      ],
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['checkInTime', 'tiers']),
    );
  });
});
