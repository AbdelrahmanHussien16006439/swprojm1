import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { UploadsService } from '../uploads/uploads.service';
import { CreateAirlineDto } from './dto/create-airline.dto';
import { UpdateBaggagePolicyDto } from './dto/update-baggage-policy.dto';
import { UpdateCancellationPolicyDto } from './dto/update-cancellation-policy.dto';
import { UpdateAirlineDto } from './dto/update-airline.dto';
import { Airline } from './schemas/airline.schema';

@Injectable()
export class AirlinesService {
  constructor(
    @InjectModel(Airline.name)
    private readonly airlineModel: Model<Airline>,
    private readonly uploadsService: UploadsService,
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

  async updateCancellationPolicy(
    id: string,
    dto: UpdateCancellationPolicyDto,
    user: JwtUser,
  ): Promise<Airline> {
    if (!user.providerId || user.providerId !== id) {
      throw new NotFoundException('Airline not found');
    }

    const airline = await this.airlineModel
      .findOneAndUpdate(
        { _id: id },
        { $set: { cancellationTiers: dto.tiers } },
        { new: true, runValidators: true },
      )
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

  async updateBaggagePolicy(
    id: string,
    dto: UpdateBaggagePolicyDto,
    user: JwtUser,
  ): Promise<Airline> {
    if (!user.providerId || user.providerId !== id) {
      throw new NotFoundException('Airline not found');
    }

    const airline = await this.airlineModel
      .findOneAndUpdate(
        { _id: id },
        { $set: { baggagePolicy: dto } },
        { new: true, runValidators: true },
      )
      .exec();
    if (!airline) throw new NotFoundException('Airline not found');
    return airline;
  }

  async uploadLogo(
    id: string,
    user: JwtUser,
    file: Express.Multer.File,
  ): Promise<Airline> {
    if (!user.providerId || user.providerId !== id) {
      throw new NotFoundException('Airline not found');
    }

    const airline = await this.findById(id);
    const uploaded = await this.uploadsService.saveImage(file);

    try {
      const updated = await this.airlineModel
        .findOneAndUpdate(
          { _id: id },
          { $set: { logoUrl: uploaded.url } },
          { new: true, runValidators: true },
        )
        .exec();
      if (!updated) {
        await this.uploadsService.deleteImage(uploaded.id);
        throw new NotFoundException('Airline not found');
      }

      const oldImageId = this.getManagedImageId(airline.logoUrl);
      if (oldImageId && oldImageId !== uploaded.id) {
        await this.uploadsService.deleteImage(oldImageId);
      }
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      await this.uploadsService.deleteImage(uploaded.id);
      throw error;
    }
  }

  private getManagedImageId(url: string | null | undefined): string | null {
    const match = url?.match(
      /\/uploads\/([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})\.(?:jpg|png)$/i,
    );
    return match?.[1] ?? null;
  }

  private throwDuplicateCode(error: unknown): void {
    if ((error as { code?: number })?.code === 11000) {
      throw new ConflictException('Airline code already exists');
    }
  }
}
