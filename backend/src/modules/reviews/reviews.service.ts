import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { paginate } from '../../common/utils/pagination';
import { HotelsService } from '../hotels/hotels.service';
import { UsersService } from '../users/users.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListHotelReviewsQueryDto } from './dto/list-hotel-reviews-query.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review } from './schemas/review.schema';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private readonly reviewModel: Model<Review>,
    private readonly hotelsService: HotelsService,
    private readonly usersService: UsersService,
  ) {}

  /** HTL-23: one review is linked to one completed reservation. */
  async createForBooking(
    userId: string,
    hotelId: string,
    bookingId: string,
    dto: CreateReviewDto,
  ) {
    let review: Review;
    try {
      review = await this.reviewModel.create({
        userId: new Types.ObjectId(userId),
        hotelId: new Types.ObjectId(hotelId),
        hotelBookingId: new Types.ObjectId(bookingId),
        rating: dto.rating,
        text: dto.text,
      });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'A review already exists for this reservation',
        );
      }
      throw error;
    }
    await this.recalculateHotelRating(hotelId);
    return this.toReviewView(review);
  }

  /** HTL-23: update only the logged-in review author's own review. */
  async update(reviewId: string, userId: string, dto: UpdateReviewDto) {
    if (dto.rating === undefined && dto.text === undefined) {
      throw new BadRequestException('Provide a rating or text to update');
    }
    const review = await this.reviewModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(reviewId),
          userId: new Types.ObjectId(userId),
        },
        { $set: dto },
        { new: true, runValidators: true },
      )
      .exec();
    if (!review) throw new NotFoundException('Review not found');
    await this.recalculateHotelRating(review.hotelId.toString());
    return this.toReviewView(review);
  }

  /** HTL-23: delete only the logged-in review author's own review. */
  async remove(reviewId: string, userId: string) {
    const review = await this.reviewModel
      .findOneAndDelete({
        _id: new Types.ObjectId(reviewId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!review) throw new NotFoundException('Review not found');
    await this.recalculateHotelRating(review.hotelId.toString());
    return { deleted: true };
  }

  /** HTL-24: public newest-first reviews; hidden reviews never enter the result. */
  async listForHotel(hotelId: string, query: ListHotelReviewsQueryDto) {
    const hotel = await this.hotelsService.findById(hotelId);
    const result = await paginate(
      this.reviewModel,
      { hotelId: new Types.ObjectId(hotelId), isHidden: false },
      query.page,
      { sort: { createdAt: -1, _id: -1 } },
    );
    const data = await Promise.all(
      result.data.map((review) => this.toReviewView(review)),
    );
    return {
      averageRating: hotel.averageRating,
      ratingsCount: hotel.ratingsCount,
      ...result,
      data,
    };
  }

  /** Recompute aggregate rating from visible reviews (HTL-23 / HTL-24). */
  async recalculateHotelRating(hotelId: string): Promise<void> {
    const [aggregate] = await this.reviewModel
      .aggregate<{
        averageRating: number;
        ratingsCount: number;
      }>([
        {
          $match: {
            hotelId: new Types.ObjectId(hotelId),
            isHidden: false,
          },
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            ratingsCount: { $sum: 1 },
          },
        },
      ])
      .exec();
    await this.hotelsService.updateRating(
      hotelId,
      aggregate?.averageRating ?? 0,
      aggregate?.ratingsCount ?? 0,
    );
  }

  private async toReviewView(review: Review) {
    const document = review as Review & { _id: Types.ObjectId };
    const author = await this.usersService.findPublicProfile(
      review.userId.toString(),
    );
    return {
      id: document._id.toString(),
      author: { id: author.id, name: author.name },
      rating: review.rating,
      text: review.text ?? null,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  private isDuplicateKeyError(error: unknown): boolean {
    const candidate = error as {
      code?: number;
      cause?: { code?: number };
    };
    return candidate?.code === 11000 || candidate?.cause?.code === 11000;
  }
}
