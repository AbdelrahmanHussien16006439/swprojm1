import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Types } from 'mongoose';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { AirlinesService } from '../airlines/airlines.service';
import { FlightStatus } from './flights.constants';
import { CreateCabinDto } from './dto/create-cabin.dto';
import { UpdateCabinDto } from './dto/update-cabin.dto';
import { Flight } from './schemas/flight.schema';

@Injectable()
export class FlightsService {
  constructor(
    @InjectModel(Flight.name)
    private readonly flightModel: Model<Flight>,
    private readonly airlinesService: AirlinesService,
  ) {}

  async findById(id: string): Promise<Flight> {
    const flight = await this.flightModel.findById(id).exec();
    if (!flight) throw new NotFoundException('Flight not found');
    return flight;
  }

  /** FLT-30: every minute, only scheduled flights past departure become departed. */
  @Cron(CronExpression.EVERY_MINUTE)
  async markDepartedFlights(): Promise<void> {
    await this.flightModel
      .updateMany(
        {
          status: FlightStatus.SCHEDULED,
          departureTime: { $lte: new Date() },
        },
        { $set: { status: FlightStatus.DEPARTED } },
      )
      .exec();
  }

  async addCabin(
    flightId: string,
    dto: CreateCabinDto,
    user: JwtUser,
  ): Promise<Flight> {
    const airlineObjectId = this.getProviderObjectId(user);
    const flight = await this.getOwnedScheduledFlight(flightId, user);
    if (flight.cabins.some((cabin) => cabin.cabinClass === dto.cabinClass)) {
      throw new ConflictException('This cabin class already exists on the flight');
    }

    const updated = await this.flightModel
      .findOneAndUpdate(
        {
          _id: flightId,
          status: FlightStatus.SCHEDULED,
          airlineId: airlineObjectId,
          // Keep the duplicate-class check inside the atomic update filter.
          $expr: {
            $eq: [
              {
                $size: {
                  $filter: {
                    input: { $ifNull: ['$cabins', []] },
                    as: 'cabin',
                    cond: { $eq: ['$$cabin.cabinClass', dto.cabinClass] },
                  },
                },
              },
              0,
            ],
          },
        },
        {
          $push: {
            cabins: {
              cabinClass: dto.cabinClass,
              price: dto.price,
              totalSeats: dto.totalSeats,
              availableSeats: dto.totalSeats,
              heldSeats: 0,
              bookedSeats: 0,
              freeBags: dto.freeBags,
              maxBagWeightKg: dto.maxBagWeightKg,
            },
          },
        },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updated) throw new ConflictException('Cabin could not be added');
    return updated;
  }

  async updateCabin(
    flightId: string,
    cabinId: string,
    dto: UpdateCabinDto,
    user: JwtUser,
  ): Promise<Flight> {
    const airlineObjectId = this.getProviderObjectId(user);
    await this.getOwnedScheduledFlight(flightId, user);
    const cabinObjectId = new Types.ObjectId(cabinId);

    if (dto.totalSeats !== undefined) {
      const capacityFilter = {
        _id: flightId,
        status: FlightStatus.SCHEDULED,
        airlineId: airlineObjectId,
        $expr: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: '$cabins',
                  as: 'cabin',
                  cond: {
                    $and: [
                      { $eq: ['$$cabin._id', cabinObjectId] },
                      {
                        $gte: [
                          dto.totalSeats,
                          { $add: ['$$cabin.bookedSeats', '$$cabin.heldSeats'] },
                        ],
                      },
                    ],
                  },
                },
              },
            },
            0,
          ],
        },
      };
      const updated = await this.flightModel
        .findOneAndUpdate(
          capacityFilter,
          [
            {
              $set: {
                cabins: {
                  $map: {
                    input: '$cabins',
                    as: 'cabin',
                    in: {
                      $cond: [
                        { $eq: ['$$cabin._id', cabinObjectId] },
                        {
                          $mergeObjects: [
                            '$$cabin',
                            {
                              ...(dto.price !== undefined ? { price: dto.price } : {}),
                              totalSeats: dto.totalSeats,
                              availableSeats: {
                                $subtract: [
                                  dto.totalSeats,
                                  { $add: ['$$cabin.bookedSeats', '$$cabin.heldSeats'] },
                                ],
                              },
                            },
                          ],
                        },
                        '$$cabin',
                      ],
                    },
                  },
                },
              },
            },
          ],
          { new: true },
        )
        .exec();
      if (!updated) {
        throw new BadRequestException(
          'Seat count cannot be below booked plus held seats, or cabin was not found',
        );
      }
      return updated;
    }

    if (dto.price === undefined) {
      throw new BadRequestException('At least one cabin field must be provided');
    }
    const updated = await this.flightModel
      .findOneAndUpdate(
        {
          _id: flightId,
          status: FlightStatus.SCHEDULED,
          airlineId: airlineObjectId,
          'cabins._id': cabinObjectId,
        },
        { $set: { 'cabins.$.price': dto.price } },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updated) throw new NotFoundException('Cabin not found');
    return updated;
  }

  private async getOwnedScheduledFlight(
    flightId: string,
    user: JwtUser,
  ): Promise<Flight> {
    const providerObjectId = this.getProviderObjectId(user);
    const flight = await this.findById(flightId);
    await this.airlinesService.findById(flight.airlineId.toString());
    if (!flight.airlineId.equals(providerObjectId)) {
      throw new NotFoundException('Flight not found');
    }
    if (flight.status !== FlightStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled flights can be edited');
    }
    return flight;
  }

  private getProviderObjectId(user: JwtUser): Types.ObjectId {
    if (!user.providerId || !Types.ObjectId.isValid(user.providerId)) {
      throw new NotFoundException('Flight not found');
    }
    return new Types.ObjectId(user.providerId);
  }
}
