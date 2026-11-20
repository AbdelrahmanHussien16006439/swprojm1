import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRoomDto } from './create-room.dto';
import { RoomDateRangeDto, UpdateRoomAvailabilityDto } from './room-date-range.dto';
import { UpdateRoomDto } from './update-room.dto';

describe('Room request DTOs', () => {
  it('validates room occupancy and positive price', async () => {
    const dto = plainToInstance(CreateRoomDto, {
      name: '301',
      type: 'Deluxe',
      beds: '1',
      maxOccupancy: '2',
      pricePerNight: '120',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);

    const invalid = plainToInstance(CreateRoomDto, {
      name: '301',
      type: 'Deluxe',
      beds: 1,
      maxOccupancy: 0,
      pricePerNight: 0,
    });
    const errors = await validate(invalid);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['maxOccupancy', 'pricePerNight']),
    );
  });

  it('allows partial room edits and validates an active flag', async () => {
    const dto = plainToInstance(UpdateRoomDto, { isActive: false });
    await expect(validate(dto)).resolves.toHaveLength(0);

    const invalid = plainToInstance(UpdateRoomDto, { isActive: 'false' });
    const errors = await validate(invalid);
    expect(errors.map((error) => error.property)).toContain('isActive');
  });

  it('validates strict date-only availability range values', async () => {
    const range = plainToInstance(RoomDateRangeDto, {
      startDate: '2026-12-01',
      endDate: '2026-12-31',
    });
    await expect(validate(range)).resolves.toHaveLength(0);

    const invalid = plainToInstance(UpdateRoomAvailabilityDto, {
      availabilityRanges: [{ startDate: '2026-02-31', endDate: '2026-03-01' }],
    });
    const errors = await validate(invalid);
    expect(errors.map((error) => error.property)).toContain('availabilityRanges');
  });
});
