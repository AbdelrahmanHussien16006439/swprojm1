import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join, resolve } from 'path';

export interface UploadResult {
  id: string;
  url: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Injectable()
export class UploadsService {
  /** GEN-08: save a validated JPG/PNG using a server-generated filename. */
  async upload(file: Express.Multer.File): Promise<UploadResult> {
    if (!file?.buffer) {
      throw new BadRequestException('A file is required');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File must be 5 MB or smaller');
    }

    const extension = this.getVerifiedExtension(file);
    const id = randomUUID();
    const filename = `${id}.${extension}`;
    // Resolve from this module so uploads always land in backend/uploads,
    // even when the server is launched from a different working directory.
    const uploadsDirectory = resolve(__dirname, '../../../uploads');

    await mkdir(uploadsDirectory, { recursive: true });
    await writeFile(join(uploadsDirectory, filename), file.buffer, {
      flag: 'wx',
    });

    return { id, url: `/uploads/${filename}` };
  }

  private getVerifiedExtension(file: Express.Multer.File): 'jpg' | 'png' {
    const isJpeg =
      file.mimetype === 'image/jpeg' &&
      file.buffer.length >= 3 &&
      file.buffer[0] === 0xff &&
      file.buffer[1] === 0xd8 &&
      file.buffer[2] === 0xff;
    const isPng =
      file.mimetype === 'image/png' &&
      file.buffer.length >= 8 &&
      file.buffer.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );

    if (isJpeg) return 'jpg';
    if (isPng) return 'png';
    throw new BadRequestException('Only valid JPG and PNG images are allowed');
  }
}
