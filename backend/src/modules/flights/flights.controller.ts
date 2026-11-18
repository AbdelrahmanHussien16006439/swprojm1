import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
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
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { CreateCabinDto } from './dto/create-cabin.dto';
import { UpdateCabinDto } from './dto/update-cabin.dto';
import { FlightsService } from './flights.service';

@ApiTags('flights')
@Controller('flights')
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

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
