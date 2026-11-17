import { BadRequestException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { basename } from 'path';
import { UploadsService } from './uploads.service';

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  unlink: jest.fn(),
  writeFile: jest.fn(),
}));

describe('UploadsService image API', () => {
  const service = new UploadsService();
  const id = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => jest.clearAllMocks());

  it('saveImage delegates to existing upload validation and storage', async () => {
    const file = { buffer: Buffer.from('image') } as Express.Multer.File;
    const result = { id, url: `/uploads/${id}.png` };
    const upload = jest.spyOn(service, 'upload').mockResolvedValue(result);

    await expect(service.saveImage(file)).resolves.toEqual(result);
    expect(upload).toHaveBeenCalledWith(file);
  });

  it('rejects an unsafe image id before touching the filesystem', async () => {
    await expect(service.deleteImage('../../secret')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(unlink).not.toHaveBeenCalled();
  });

  it('removes only files named with the supplied server-generated UUID', async () => {
    (unlink as jest.Mock).mockResolvedValue(undefined);

    await service.deleteImage(id);

    expect(unlink).toHaveBeenCalledTimes(2);
    expect(
      (unlink as jest.Mock).mock.calls.map(([path]) => basename(path)),
    ).toEqual([`${id}.jpg`, `${id}.png`]);
  });

  it('treats an already missing image file as successfully removed', async () => {
    (unlink as jest.Mock).mockRejectedValue({ code: 'ENOENT' });

    await expect(service.deleteImage(id)).resolves.toBeUndefined();
  });
});
