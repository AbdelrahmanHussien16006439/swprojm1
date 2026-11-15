import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ProviderType } from '../../../common/enums/provider-type.enum';
import { Role } from '../../../common/enums/role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  // GEN-13: bcrypt salted hash, never selected by default and never returned
  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ uppercase: true, default: 'USD' })
  preferredCurrency: string;

  @Prop({ type: String, enum: Object.values(Role), default: Role.USER })
  role: Role;

  @Prop({
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  // Moderators only (ACC-13): the one airline/hotel they manage
  @Prop({ type: String, enum: Object.values(ProviderType) })
  providerType?: ProviderType;

  @Prop({ type: Types.ObjectId })
  providerId?: Types.ObjectId;

  @Prop()
  termsAcceptedAt?: Date;

  // ACC-07a, ACC-13: user must set a new password at next login
  @Prop({ default: false })
  mustChangePassword: boolean;

  // ACC-05: login lockout
  @Prop({ default: 0 })
  failedLoginAttempts: number;

  @Prop({ type: Date, default: null })
  lockUntil: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ role: 1, status: 1 });
