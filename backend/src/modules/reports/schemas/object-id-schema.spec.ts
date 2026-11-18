import { ReportSchema } from './report.schema';

describe('Report ObjectId schema paths', () => {
  it.each(['reporterId', 'targetId', 'resolvedBy'])(
    '%s is stored as an ObjectId',
    (path) => {
      expect(ReportSchema.path(path).instance).toBe('ObjectId');
    },
  );
});
