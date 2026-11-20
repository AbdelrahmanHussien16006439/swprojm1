import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
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
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { CreateItineraryActivityDto } from './dto/create-itinerary-activity.dto';
import { UpdateItineraryActivityDto } from './dto/update-itinerary-activity.dto';
import { ItinerariesService } from './itineraries.service';

@ApiTags('itinerary activities')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER)
@Controller('activities')
export class ItineraryActivitiesController {
  constructor(private readonly itinerariesService: ItinerariesService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Edit an activity (ITN-10)' })
  @ApiOkResponse({ description: 'Activity updated' })
  @ApiBadRequestResponse({ description: 'Invalid activity fields or unsupported currency' })
  @ApiNotFoundResponse({ description: 'Activity not found' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateItineraryActivityDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.itinerariesService.updateActivity(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an activity and its attached images (ITN-10)' })
  @ApiOkResponse({ description: 'Activity deleted' })
  @ApiNotFoundResponse({ description: 'Activity not found' })
  delete(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.itinerariesService.deleteActivity(id, user);
  }

  @Post(':id/images')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiOperation({ summary: 'Attach a JPG or PNG image to an activity (ITN-12, GEN-08)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ description: 'Image attached to the activity' })
  @ApiBadRequestResponse({ description: 'Missing/invalid image, unsupported file, or activity already has 5 images' })
  @ApiPayloadTooLargeResponse({ description: 'Image exceeds the shared 5 MB upload limit' })
  @ApiNotFoundResponse({ description: 'Activity not found' })
  addImage(
    @Param('id', ParseObjectIdPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtUser,
  ) {
    return this.itinerariesService.addActivityImage(id, file, user);
  }

  @Delete(':id/images/:imageId')
  @ApiOperation({ summary: 'Remove an image from an activity (ITN-12)' })
  @ApiOkResponse({ description: 'Image removed' })
  @ApiBadRequestResponse({ description: 'Invalid image id' })
  @ApiNotFoundResponse({ description: 'Activity or image not found' })
  removeImage(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.itinerariesService.deleteActivityImage(id, imageId, user);
  }
}
