import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BlogController } from './blog.controller';

describe('BlogController image authorization (BLG-10)', () => {
  it.each(['addPostImage', 'deletePostImage'] as const)(
    '%s requires authentication and the user role',
    (methodName) => {
      const handler = BlogController.prototype[methodName];

      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
        JwtAuthGuard,
        RolesGuard,
      ]);
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([Role.USER]);
    },
  );
});
