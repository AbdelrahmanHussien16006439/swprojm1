import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Connection, FilterQuery, Model, Types } from 'mongoose';
import { ProviderType } from '../../common/enums/provider-type.enum';
import { Role } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { escapeRegex } from '../../common/utils/escape-regex';
import { paginate, Paginated } from '../../common/utils/pagination';
import { ListAccountsQueryDto } from './dto/list-accounts-query.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User, UserDocument } from './schemas/user.schema';
import { SessionsService } from './sessions.service';
import { BCRYPT_SALT_ROUNDS } from './users.constants';

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role?: Role;
  providerType?: ProviderType;
  providerId?: string;
  mustChangePassword?: boolean;
  termsAcceptedAt?: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectConnection() private readonly connection: Connection,
    private readonly sessionsService: SessionsService,
  ) {}

  // ---------- Lookups (also used by other members) ----------

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  /** Public author info for blog/reviews/itineraries (M2, M6, M7). */
  async findPublicProfile(id: string) {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user._id.toString(),
      name: user.status === UserStatus.DEACTIVATED ? 'Deleted user' : user.name,
      joinedAt: user.createdAt,
      status: user.status,
    };
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .select('+passwordHash')
      .exec();
  }

  findByIdWithPassword(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('+passwordHash').exec();
  }

  async getByIdOrFail(id: string): Promise<UserDocument> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ---------- Creation & passwords ----------

  async create(data: CreateUserData): Promise<UserDocument> {
    if (await this.findByEmail(data.email)) {
      throw new ConflictException('Email is already registered');
    }
    try {
      return await this.userModel.create({
        name: data.name,
        email: data.email,
        passwordHash: await this.hashPassword(data.password),
        role: data.role ?? Role.USER,
        providerType: data.providerType,
        providerId: data.providerId
          ? new Types.ObjectId(data.providerId)
          : undefined,
        mustChangePassword: data.mustChangePassword ?? false,
        termsAcceptedAt: data.termsAcceptedAt,
      });
    } catch (error) {
      // Two requests with the same email at the same time
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  verifyPassword(user: UserDocument, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async setPassword(
    id: string,
    password: string,
    mustChangePassword: boolean,
  ): Promise<void> {
    await this.userModel.updateOne(
      { _id: id },
      {
        passwordHash: await this.hashPassword(password),
        mustChangePassword,
        failedLoginAttempts: 0,
        lockUntil: null,
      },
    );
  }

  // ---------- Login lockout (ACC-05) ----------

  /** Atomically adds one failed attempt and returns the new count. */
  async incrementFailedLogins(id: string): Promise<number> {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { $inc: { failedLoginAttempts: 1 } },
      { new: true },
    );
    return user?.failedLoginAttempts ?? 0;
  }

  async lock(id: string, until: Date): Promise<void> {
    await this.userModel.updateOne(
      { _id: id },
      { lockUntil: until, failedLoginAttempts: 0 },
    );
  }

  async resetLoginAttempts(id: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: id },
      { failedLoginAttempts: 0, lockUntil: null },
    );
  }

  // ---------- Profile (ACC-09, ACC-11, ACC-12) ----------

  async getProfile(id: string) {
    return this.toProfile(await this.getByIdOrFail(id));
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    // ⏳ ACC-09: also check ReferenceDataService.isSupportedCurrency(dto.preferredCurrency)
    // once Member 5's ReferenceDataModule is merged (format is already validated by the DTO).
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { $set: dto },
      { new: true, runValidators: true },
    );
    if (!user) throw new NotFoundException('User not found');
    return this.toProfile(user);
  }

  /** ACC-12: user deletes (deactivates) their own account. */
  async deactivateOwnAccount(id: string): Promise<void> {
    if (await this.hasUpcomingConfirmedBookings(id)) {
      throw new BadRequestException(
        'You cannot deactivate your account while you have upcoming confirmed bookings',
      );
    }
    await this.setStatus(id, UserStatus.DEACTIVATED);
    await this.sessionsService.revokeAllForUser(id);
  }

  // ---------- Admin (ACC-14, ACC-15, ACC-16) ----------

  async setStatus(id: string, status: UserStatus): Promise<void> {
    await this.userModel.updateOne({ _id: id }, { status });
  }

  async listAccounts(
    query: ListAccountsQueryDto,
  ): Promise<Paginated<ReturnType<UsersService['toAccountSummary']>>> {
    const filter: FilterQuery<User> = {};
    if (query.role) filter.role = query.role;
    if (query.status) filter.status = query.status;
    if (query.q) {
      const pattern = new RegExp(escapeRegex(query.q.trim()), 'i');
      filter.$or = [{ name: pattern }, { email: pattern }];
    }
    const result = await paginate(this.userModel, filter, query.page, {
      sort: { createdAt: -1 },
    });
    return {
      ...result,
      data: result.data.map((user) =>
        this.toAccountSummary(user as UserDocument),
      ),
    };
  }

  // ---------- Response shapes (never include passwordHash) ----------

  /** Shape returned by login and GET /auth/me (ACC-04, ACC-19). */
  toAuthUser(user: UserDocument) {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      providerId: user.providerId?.toString() ?? null,
      mustChangePassword: user.mustChangePassword,
    };
  }

  toProfile(user: UserDocument) {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      preferredCurrency: user.preferredCurrency,
      role: user.role,
      status: user.status,
      providerType: user.providerType ?? null,
      providerId: user.providerId?.toString() ?? null,
      mustChangePassword: user.mustChangePassword,
      termsAcceptedAt: user.termsAcceptedAt ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  toAccountSummary(user: UserDocument) {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      providerType: user.providerType ?? null,
      providerId: user.providerId?.toString() ?? null,
      registeredAt: user.createdAt,
    };
  }

  /**
   * ⏳ ACC-12 should call FlightBookingsService.hasUpcomingConfirmed (M4) and
   * HotelBookingsService.hasUpcomingConfirmed (M6). Until those are merged this reads
   * their collections directly (field/status names from TEAM_PLAN 3.7 / 3.8).
   * A booking stays 'confirmed' until its trip is over (then 'completed'), so any
   * confirmed booking counts as upcoming.
   * TODO: replace with the two service calls once they are merged into develop.
   */
  private async hasUpcomingConfirmedBookings(userId: string): Promise<boolean> {
    const filter = { userId: new Types.ObjectId(userId), status: 'confirmed' };
    const [flights, hotels] = await Promise.all([
      this.connection.collection('flightbookings').countDocuments(filter),
      this.connection.collection('hotelbookings').countDocuments(filter),
    ]);
    return flights + hotels > 0;
  }
}
