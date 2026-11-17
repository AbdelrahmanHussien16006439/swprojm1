import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UploadsController } from './uploads.controller';

describe('UploadsController authorization (GEN-08)', () => {
  it('requires authentication for direct uploads', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, UploadsController.prototype.upload),
    ).toEqual([JwtAuthGuard]);
  });
});
