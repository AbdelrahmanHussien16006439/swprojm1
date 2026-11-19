import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { ListItinerariesQueryDto } from './dto/list-itineraries-query.dto';
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
  @ApiOperation({ summary: 'Edit itinerary title, countries, or start date (ITN-01)' })
  @ApiOkResponse({ description: 'Itinerary updated' })
  @ApiBadRequestResponse({ description: 'Invalid fields or unknown country' })
  @ApiNotFoundResponse({ description: 'Itinerary not found' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateItineraryDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.itinerariesService.update(id, dto, user);
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
}
