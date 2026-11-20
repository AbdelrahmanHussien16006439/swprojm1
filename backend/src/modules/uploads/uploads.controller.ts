import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiProperty,
  ApiTags,
  ApiCookieAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { UploadResult } from './uploads.service';
import { UploadsService } from './uploads.service';

class UploadResponseDto implements UploadResult {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  id!: string;

  @ApiProperty({ example: '/uploads/550e8400-e29b-41d4-a716-446655440000.jpg' })
  @IsString()
  @Matches(/^\/uploads\/[a-f0-9-]+\.(jpg|png)$/)
  url!: string;
}

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('access_token')
  @ApiUnauthorizedResponse({ description: 'Login required' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiOperation({ summary: 'Upload a JPG or PNG image (GEN-08)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({
    description: 'Image uploaded',
    type: UploadResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'File is missing or not a valid JPG/PNG',
  })
  @ApiPayloadTooLargeResponse({ description: 'File exceeds the 5 MB limit' })
  upload(@UploadedFile() file: Express.Multer.File): Promise<UploadResult> {
    return this.uploadsService.upload(file);
  }
}
