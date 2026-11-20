import {
  Body,
  Controller,
  Delete,
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
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ConfirmActionDto } from '../../common/dto/confirm-action.dto';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { CreateItineraryActivityDto } from './dto/create-itinerary-activity.dto';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { CreateItineraryBudgetDto } from './dto/create-itinerary-budget.dto';
import { CreateItineraryTransportCostDto } from './dto/create-itinerary-transport-cost.dto';
import { CreateItineraryDayDto } from './dto/create-itinerary-day.dto';
import { ListItinerariesQueryDto } from './dto/list-itineraries-query.dto';
import { ReorderItineraryDayDto } from './dto/reorder-itinerary-day.dto';
import { UpdateItineraryDayDto } from './dto/update-itinerary-day.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';
import { ItinerariesService } from './itineraries.service';

@ApiTags('itineraries')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER)
@Controller('itineraries')
export class ItinerariesController {
  constructor(private readonly itinerariesService: ItinerariesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a private itinerary (ITN-01)' })
  @ApiCreatedResponse({ description: 'Private itinerary created' })
  @ApiBadRequestResponse({ description: 'Invalid itinerary fields or unknown country' })
  create(@Body() dto: CreateItineraryDto, @CurrentUser() user: JwtUser) {
    return this.itinerariesService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List my itineraries, most recently updated first (ITN-03)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiOkResponse({ description: 'Paginated itinerary summaries' })
  list(@Query() query: ListItinerariesQueryDto, @CurrentUser() user: JwtUser) {
    return this.itinerariesService.list(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'View one of my itineraries (ITN-03)' })
  @ApiOkResponse({ description: 'Itinerary details' })
  @ApiNotFoundResponse({ description: 'Itinerary not found' })
  findOne(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.itinerariesService.findOwned(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit itinerary details or visibility (ITN-01, ITN-20)' })
  @ApiOkResponse({ description: 'Itinerary updated; private itineraries disappear from public search immediately' })
  @ApiBadRequestResponse({ description: 'Invalid fields or unknown country' })
  @ApiNotFoundResponse({ description: 'Itinerary not found' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateItineraryDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.itinerariesService.update(id, dto, user);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone a public itinerary privately with attribution (ITN-21)' })
  @ApiCreatedResponse({ description: 'Private independent copy created' })
  @ApiNotFoundResponse({ description: 'Source itinerary is not public or visible' })
  clone(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.itinerariesService.clonePublic(id, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an itinerary after explicit confirmation (ITN-01)' })
  @ApiOkResponse({ description: 'Itinerary deleted' })
  @ApiBadRequestResponse({ description: 'confirm must be true' })
  @ApiNotFoundResponse({ description: 'Itinerary not found' })
  async delete(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: ConfirmActionDto,
    @CurrentUser() user: JwtUser,
  ) {
    await this.itinerariesService.delete(id, dto, user);
    return { message: 'Itinerary deleted' };
  }

  @Post(':id/days')
  @ApiOperation({ summary: 'Add a day to an itinerary (ITN-05, ITN-09)' })
  @ApiCreatedResponse({ description: 'Day added; day numbers, dates, and city groups are computed' })
  @ApiBadRequestResponse({ description: 'Invalid city, position, or itinerary already has 60 days' })
  @ApiNotFoundResponse({ description: 'Itinerary or city not found' })
  addDay(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: CreateItineraryDayDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.itinerariesService.addDay(id, dto, user);
  }

  // Keep reorder above the :dayId route so "reorder" is not parsed as a day id.
  @Patch(':id/days/reorder')
  @ApiOperation({ summary: 'Move a day and recompute day numbers, dates, and city groups (ITN-08, ITN-09)' })
  @ApiOkResponse({ description: 'Day reordered' })
  @ApiBadRequestResponse({ description: 'Invalid position or day id' })
  @ApiNotFoundResponse({ description: 'Itinerary or day not found' })
  reorderDay(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: ReorderItineraryDayDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.itinerariesService.reorderDay(id, dto, user);
  }

  @Patch(':id/days/:dayId')
  @ApiOperation({ summary: 'Edit a day city or notes (ITN-05)' })
  @ApiOkResponse({ description: 'Day updated' })
  @ApiBadRequestResponse({ description: 'Invalid day fields' })
  @ApiNotFoundResponse({ description: 'Itinerary, day, or city not found' })
  updateDay(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('dayId', ParseObjectIdPipe) dayId: string,
    @Body() dto: UpdateItineraryDayDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.itinerariesService.updateDay(id, dayId, dto, user);
  }

  @Delete(':id/days/:dayId')
  @ApiOperation({ summary: 'Delete a day after confirmation and renumber remaining days (ITN-07)' })
  @ApiOkResponse({ description: 'Day deleted; associated transport costs removed' })
  @ApiBadRequestResponse({ description: 'confirm must be true' })
  @ApiNotFoundResponse({ description: 'Itinerary or day not found' })
  deleteDay(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('dayId', ParseObjectIdPipe) dayId: string,
    @Body() dto: ConfirmActionDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.itinerariesService.deleteDay(id, dayId, dto, user);
  }

  @Post(':id/days/:dayId/budgets')
  @ApiOperation({ summary: 'Add a budget entry to an itinerary day (ITN-14)' })
  @ApiCreatedResponse({ description: 'Budget entry created and city-group subtotals recalculated' })
  @ApiBadRequestResponse({ description: 'Invalid amount, category, or unsupported currency' })
  @ApiNotFoundResponse({ description: 'Itinerary or day not found' })
  addBudgetEntry(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('dayId', ParseObjectIdPipe) dayId: string,
    @Body() dto: CreateItineraryBudgetDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.itinerariesService.addBudgetEntry(id, dayId, dto, user);
  }

  @Post(':id/transport-costs')
  @ApiOperation({ summary: 'Add a transport cost to an itinerary day (ITN-16)' })
  @ApiCreatedResponse({ description: 'Transport cost created and city-group subtotals recalculated' })
  @ApiBadRequestResponse({ description: 'Invalid amount, city, or unsupported currency' })
  @ApiNotFoundResponse({ description: 'Itinerary or day not found' })
  addTransportCost(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: CreateItineraryTransportCostDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.itinerariesService.addTransportCost(id, dto, user);
  }

  @Post(':id/days/:dayId/activities')
  @ApiOperation({ summary: 'Add an activity to an itinerary day (ITN-10)' })
  @ApiCreatedResponse({ description: 'Activity created' })
  @ApiBadRequestResponse({ description: 'Invalid activity fields or unsupported currency' })
  @ApiNotFoundResponse({ description: 'Itinerary or day not found' })
  addActivity(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('dayId', ParseObjectIdPipe) dayId: string,
    @Body() dto: CreateItineraryActivityDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.itinerariesService.addActivity(id, dayId, dto, user);
  }

}
