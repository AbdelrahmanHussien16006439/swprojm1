import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join, resolve } from 'path';

export interface UploadResult {
  id: string;
  url: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Injectable()
export class UploadsService {
  /** BLG-10: named image API used by owning modules; validation remains in upload(). */
  saveImage(file: Express.Multer.File): Promise<UploadResult> {
    return this.upload(file);
  }

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

  /** BLG-10: remove only a UUID-named image created by this service. */
  async deleteImage(id: string): Promise<void> {
    if (
      !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
        id,
      )
    ) {
      throw new BadRequestException('Invalid image id');
    }

    const uploadsDirectory = resolve(__dirname, '../../../uploads');
    for (const extension of ['jpg', 'png']) {
      try {
        await unlink(join(uploadsDirectory, `${id}.${extension}`));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
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
