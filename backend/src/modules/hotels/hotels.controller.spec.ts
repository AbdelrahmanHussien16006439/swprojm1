import { ListHotelReviewsQueryDto } from '../reviews/dto/list-hotel-reviews-query.dto';
import { HotelsService } from './hotels.service';
import { HotelsController } from './hotels.controller';

describe('HotelsController hotel details integration', () => {
  it('returns the public hotel profile with Member 6 rating aggregate and visible reviews', async () => {
    const reviewPage = {
      averageRating: 4.5,
      ratingsCount: 2,
      data: [{ id: 'review-id', rating: 5, text: 'Great' }],
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    };
    const hotelDetails = {
      id: 'hotel-id',
      name: 'Nile View',
      averageRating: 4.5,
      ratingsCount: 2,
      reviews: reviewPage,
    };
    const hotelService = { findHotelDetails: jest.fn().mockResolvedValue(hotelDetails) };
    const controller = new HotelsController(hotelService as unknown as HotelsService);

    const result = await controller.get('hotel-id', new ListHotelReviewsQueryDto());

    expect(hotelService.findHotelDetails).toHaveBeenCalledWith(
      'hotel-id',
      expect.any(ListHotelReviewsQueryDto),
    );
    expect(result).toEqual(hotelDetails);
  });
});
