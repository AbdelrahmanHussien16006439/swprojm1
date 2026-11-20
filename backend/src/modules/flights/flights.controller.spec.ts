import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConfirmActionDto } from '../../common/dto/confirm-action.dto';

describe('Flight cancellation confirmation', () => {
  it('rejects cancellation when confirm is false', async () => {
    const dto = plainToInstance(ConfirmActionDto, { confirm: false });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toEqual({
      equals: 'confirm must be true to perform this action',
    });
  });

  it('accepts cancellation only when confirm is true', async () => {
    const dto = plainToInstance(ConfirmActionDto, { confirm: true });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
