import { SessionSchema } from './session.schema';
import { UserSchema } from './user.schema';

// @Prop({ type: Types.ObjectId }) silently becomes Mixed, so id filters stop casting.
describe('Users module schema reference fields', () => {
  it('stores the session owner as an indexed ObjectId', () => {
    expect(SessionSchema.path('userId').instance).toBe('ObjectId');
    expect(SessionSchema.path('userId').options.index).toBe(true);
  });

  it('stores the moderator provider reference as an ObjectId', () => {
    expect(UserSchema.path('providerId').instance).toBe('ObjectId');
  });
});
