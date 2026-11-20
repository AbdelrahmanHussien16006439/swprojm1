import { AuditLogSchema } from './audit-log.schema';

// @Prop({ type: Types.ObjectId }) silently becomes Mixed, so id filters stop casting.
describe('AuditLogSchema reference fields', () => {
  it('stores the actor as an indexed ObjectId', () => {
    expect(AuditLogSchema.path('actorId').instance).toBe('ObjectId');
    expect(AuditLogSchema.path('actorId').options.index).toBe(true);
  });
});
