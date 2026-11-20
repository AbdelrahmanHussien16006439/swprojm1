import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ReferenceDataQueryDto } from './dto/reference-data-query.dto';
import { ReferenceDataService } from './reference-data.service';

@ApiTags('reference-data')
@Controller()
export class ReferenceDataController {
  constructor(private readonly referenceDataService: ReferenceDataService) {}

  @Get('airports')
  @ApiOperation({ summary: 'Search the read-only seeded airport list' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'search', required: false, example: 'Cairo' })
  @ApiQuery({ name: 'iataCode', required: false, example: 'CAI' })
  @ApiQuery({ name: 'name', required: false, example: 'International Airport' })
  @ApiQuery({ name: 'city', required: false, example: 'cairo' })
  @ApiOkResponse({ description: 'Paginated airports, with linked city and country.' })
  listAirports(@Query() query: ReferenceDataQueryDto) {
    return this.referenceDataService.listAirports(query);
  }

  @Get('countries')
  @ApiOperation({ summary: 'List seeded countries' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiOkResponse({ description: 'Paginated countries.' })
  listCountries(@Query() query: ReferenceDataQueryDto) {
    return this.referenceDataService.listCountries(query.page);
  }

  @Get('cities')
  @ApiOperation({ summary: 'List seeded cities, optionally filtered by country' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'countryId', required: false, example: 'EG' })
  @ApiOkResponse({ description: 'Paginated cities, with linked country.' })
  listCities(@Query() query: ReferenceDataQueryDto) {
    return this.referenceDataService.listCities(query.page, query.countryId);
  }

  @Get('currencies')
  @ApiOperation({ summary: 'List currencies supported by the seeded countries' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiOkResponse({ description: 'Paginated unique supported currencies.' })
  listCurrencies(@Query() query: ReferenceDataQueryDto) {
    return this.referenceDataService.listCurrencies(query.page);
  }
}
