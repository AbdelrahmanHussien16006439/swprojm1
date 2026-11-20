import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConfirmActionDto } from '../../common/dto/confirm-action.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { CreateCabinDto } from './dto/create-cabin.dto';
import { CreateFlightDto } from './dto/create-flight.dto';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { UpdateFlightDto } from './dto/update-flight.dto';
import { UpdateCabinDto } from './dto/update-cabin.dto';
import { FlightsService } from './flights.service';

@ApiTags('flights')
@Controller('flights')
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AIRLINE_MODERATOR)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Create a scheduled flight (FLT-03, GEN-06)' })
  @ApiCreatedResponse({ description: 'Flight created; times are stored in UTC.' })
  create(@Body() dto: CreateFlightDto, @CurrentUser() user: JwtUser) {
    return this.flightsService.create(dto, user);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search future scheduled flights (FLT-11, FLT-12, FLT-15)' })
  @ApiOkResponse({ description: 'Paginated flight search results' })
  search(@Query() dto: SearchFlightsDto) {
    return this.flightsService.search(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get flight details with local airport times (FLT-17)' })
  @ApiOkResponse({ description: 'Flight details' })
  get(@Param('id', ParseObjectIdPipe) id: string) {
    return this.flightsService.getDetails(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AIRLINE_MODERATOR)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Edit a scheduled flight (FLT-05)' })
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateFlightDto, @CurrentUser() user: JwtUser) {
    return this.flightsService.update(id, dto, user);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AIRLINE_MODERATOR)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Cancel a scheduled flight (FLT-06)' })
  cancel(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() _dto: ConfirmActionDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.flightsService.cancel(id, user);
  }

  @Post(':id/cabins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AIRLINE_MODERATOR)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Add a cabin to my scheduled flight (FLT-04)' })
  @ApiCreatedResponse({ description: 'Cabin added to the flight' })
  @ApiBadRequestResponse({ description: 'Invalid cabin fields or flight status' })
  @ApiConflictResponse({ description: 'Cabin class already exists' })
  @ApiNotFoundResponse({ description: 'Flight not found or not owned by user' })
  addCabin(
    @Param('id', ParseObjectIdPipe) flightId: string,
    @Body() dto: CreateCabinDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.flightsService.addCabin(flightId, dto, user);
  }

  @Patch(':id/cabins/:cabinId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AIRLINE_MODERATOR)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Edit cabin price or seats (FLT-04, FLT-05)' })
  @ApiOkResponse({ description: 'Cabin updated' })
  @ApiBadRequestResponse({ description: 'Invalid update or insufficient seat capacity' })
  @ApiNotFoundResponse({ description: 'Flight or cabin not found' })
  updateCabin(
    @Param('id', ParseObjectIdPipe) flightId: string,
    @Param('cabinId', ParseObjectIdPipe) cabinId: string,
    @Body() dto: UpdateCabinDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.flightsService.updateCabin(flightId, cabinId, dto, user);
  }
}
