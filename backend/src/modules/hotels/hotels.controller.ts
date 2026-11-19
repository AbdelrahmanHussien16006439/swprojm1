import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiConflictResponse,
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
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomDateRangeDto, UpdateRoomAvailabilityDto } from './dto/room-date-range.dto';
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

  @Post(':id/rooms')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOTEL_MODERATOR)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Add a room to my hotel (HTL-03)' })
  @ApiCreatedResponse({ description: 'Room created.' })
  @ApiBadRequestResponse({ description: 'Invalid room fields.' })
  @ApiConflictResponse({ description: 'Room name already exists in this hotel.' })
  @ApiUnauthorizedResponse({ description: 'Login required.' })
  @ApiForbiddenResponse({ description: 'Hotel moderator role required.' })
  @ApiNotFoundResponse({ description: 'Hotel not found or not owned by user.' })
  createRoom(
    @Param('id', ParseObjectIdPipe) hotelId: string,
    @Body() dto: CreateRoomDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.hotelsService.createRoom(hotelId, dto, user);
  }

  @Patch(':id/rooms/:roomId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOTEL_MODERATOR)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Edit or deactivate a room in my hotel (HTL-05, HTL-06)' })
  @ApiOkResponse({ description: 'Room updated.' })
  @ApiBadRequestResponse({ description: 'Invalid room fields.' })
  @ApiConflictResponse({ description: 'Room name already exists in this hotel.' })
  @ApiUnauthorizedResponse({ description: 'Login required.' })
  @ApiForbiddenResponse({ description: 'Hotel moderator role required.' })
  @ApiNotFoundResponse({ description: 'Hotel or room not found or not owned by user.' })
  updateRoom(
    @Param('id', ParseObjectIdPipe) hotelId: string,
    @Param('roomId', ParseObjectIdPipe) roomId: string,
    @Body() dto: UpdateRoomDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.hotelsService.updateRoom(hotelId, roomId, dto, user);
  }

  @Delete(':id/rooms/:roomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOTEL_MODERATOR)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Delete a room that has never been reserved (HTL-06)' })
  @ApiConflictResponse({ description: 'Room has already been reserved.' })
  @ApiNotFoundResponse({ description: 'Hotel or room not found or not owned by user.' })
  deleteRoom(
    @Param('id', ParseObjectIdPipe) hotelId: string,
    @Param('roomId', ParseObjectIdPipe) roomId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.hotelsService.deleteRoom(hotelId, roomId, user);
  }

  @Post(':id/rooms/:roomId/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOTEL_MODERATOR)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Add an available date range to a room (HTL-04)' })
  @ApiCreatedResponse({ description: 'Availability range added.' })
  @ApiBadRequestResponse({ description: 'Invalid or overlapping availability range.' })
  @ApiUnauthorizedResponse({ description: 'Login required.' })
  @ApiForbiddenResponse({ description: 'Hotel moderator role required.' })
  @ApiNotFoundResponse({ description: 'Hotel or room not found or not owned by user.' })
  addAvailability(
    @Param('id', ParseObjectIdPipe) hotelId: string,
    @Param('roomId', ParseObjectIdPipe) roomId: string,
    @Body() dto: RoomDateRangeDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.hotelsService.addAvailability(hotelId, roomId, dto, user);
  }

  @Patch(':id/rooms/:roomId/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOTEL_MODERATOR)
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: 'Edit bookable and blocked date ranges (HTL-05, HTL-06)',
    description: 'Provided arrays replace their existing ranges; omit an array to leave it unchanged.',
  })
  @ApiOkResponse({ description: 'Room availability ranges updated.' })
  @ApiBadRequestResponse({ description: 'Invalid or overlapping availability ranges.' })
  @ApiUnauthorizedResponse({ description: 'Login required.' })
  @ApiForbiddenResponse({ description: 'Hotel moderator role required.' })
  @ApiNotFoundResponse({ description: 'Hotel or room not found or not owned by user.' })
  updateAvailability(
    @Param('id', ParseObjectIdPipe) hotelId: string,
    @Param('roomId', ParseObjectIdPipe) roomId: string,
    @Body() dto: UpdateRoomAvailabilityDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.hotelsService.updateAvailability(hotelId, roomId, dto, user);
  }
}
