import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { UpdateHotelPoliciesDto } from './dto/update-hotel-policies.dto';
import { HotelsService } from './hotels.service';

@ApiTags('hotels')
@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Create a hotel profile (HTL-01)' })
  @ApiCreatedResponse({ description: 'Hotel created.' })
  @ApiBadRequestResponse({ description: 'Invalid hotel fields or mismatched city and country.' })
  @ApiUnauthorizedResponse({ description: 'Login as an administrator.' })
  @ApiForbiddenResponse({ description: 'Administrator role required.' })
  create(@Body() dto: CreateHotelDto) {
    return this.hotelsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a public hotel profile (HTL-02)',
    description:
      'Reviews and date-specific available rooms await Member 6 review and RoomNight support.',
  })
  @ApiOkResponse({ description: 'Hotel profile, policy, photos, amenities and rating.' })
  @ApiNotFoundResponse({ description: 'Hotel not found.' })
  get(@Param('id', ParseObjectIdPipe) id: string) {
    return this.hotelsService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOTEL_MODERATOR)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Edit my hotel profile and standard times (HTL-01, HTL-09)' })
  @ApiOkResponse({ description: 'Hotel profile updated.' })
  @ApiBadRequestResponse({ description: 'Invalid hotel fields or mismatched city and country.' })
  @ApiUnauthorizedResponse({ description: 'Login required.' })
  @ApiForbiddenResponse({ description: 'Hotel moderator role required.' })
  @ApiNotFoundResponse({ description: 'Hotel not found.' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateHotelDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.hotelsService.update(id, dto, user);
  }

  @Put(':id/policies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOTEL_MODERATOR)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Set hotel check-in/out times and cancellation tiers (HTL-09, HTL-10)' })
  @ApiOkResponse({ description: 'Hotel policies updated.' })
  @ApiBadRequestResponse({ description: 'Invalid times or cancellation tiers.' })
  @ApiUnauthorizedResponse({ description: 'Login required.' })
  @ApiForbiddenResponse({ description: 'Hotel moderator role required.' })
  @ApiNotFoundResponse({ description: 'Hotel not found.' })
  updatePolicies(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateHotelPoliciesDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.hotelsService.updatePolicies(id, dto, user);
  }
}
