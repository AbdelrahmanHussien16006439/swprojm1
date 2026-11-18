import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { CreateAirlineDto } from './dto/create-airline.dto';
import { UpdateAirlineDto } from './dto/update-airline.dto';
import { Airline } from './schemas/airline.schema';

@Injectable()
export class AirlinesService {
  constructor(
    @InjectModel(Airline.name)
    private readonly airlineModel: Model<Airline>,
  ) {}

  async create(dto: CreateAirlineDto): Promise<Airline> {
    try {
      return await this.airlineModel.create({
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
      });
    } catch (error) {
      this.throwDuplicateCode(error);
      throw error;
    }
  }

  async findById(id: string): Promise<Airline> {
    const airline = await this.airlineModel.findById(id).exec();
    if (!airline) throw new NotFoundException('Airline not found');
    return airline;
  }

  async update(id: string, dto: UpdateAirlineDto, user: JwtUser): Promise<Airline> {
    if (!user.providerId || user.providerId !== id) {
      throw new NotFoundException('Airline not found');
    }
    const update: Partial<Airline> = {};
    if (dto.name !== undefined) update.name = dto.name.trim();
    if (dto.code !== undefined) update.code = dto.code.trim().toUpperCase();

    try {
      const airline = await this.airlineModel
        .findOneAndUpdate({ _id: id }, update, { new: true, runValidators: true })
        .exec();
      if (!airline) throw new NotFoundException('Airline not found');
      return airline;
    } catch (error) {
      this.throwDuplicateCode(error);
      throw error;
    }
  }

  async setActive(id: string, isActive: boolean): Promise<Airline> {
    const airline = await this.airlineModel
      .findByIdAndUpdate(id, { isActive }, { new: true, runValidators: true })
      .exec();
    if (!airline) throw new NotFoundException('Airline not found');
    return airline;
  }

  async getModeratorPolicies(airlineId: string) {
    const airline = await this.findById(airlineId);
    return {
      baggagePolicy: airline.baggagePolicy,
      cancellationTiers: airline.cancellationTiers,
    };
  }

  private throwDuplicateCode(error: unknown): void {
    if ((error as { code?: number })?.code === 11000) {
      throw new ConflictException('Airline code already exists');
    }
  }
}
