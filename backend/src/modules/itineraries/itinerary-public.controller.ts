import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { PublicItinerariesQueryDto } from './dto/public-itineraries-query.dto';
import { ItinerariesService } from './itineraries.service';

@ApiTags('public itineraries')
@Controller('itineraries/public')
export class ItineraryPublicController {
  constructor(private readonly itinerariesService: ItinerariesService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search public itineraries by keyword, duration, country, or city (ITN-20, ITN-21)' })
  @ApiQuery({ name: 'q', required: false, example: 'Cairo' })
  @ApiQuery({ name: 'minDays', required: false, example: 3 })
  @ApiQuery({ name: 'maxDays', required: false, example: 14 })
  @ApiQuery({ name: 'countryId', required: false, example: 'EG' })
  @ApiQuery({ name: 'cityId', required: false, example: 'cairo' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiOkResponse({ description: 'Paginated public itinerary summaries with authors' })
  @ApiBadRequestResponse({ description: 'Invalid filter values' })
  search(@Query() query: PublicItinerariesQueryDto) {
    return this.itinerariesService.searchPublic(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'View a public itinerary read-only (ITN-21)' })
  @ApiOkResponse({ description: 'Public itinerary details, author, days, activities, and budgets' })
  @ApiNotFoundResponse({ description: 'Itinerary not found or not public/visible' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.itinerariesService.findPublic(id);
  }
}
