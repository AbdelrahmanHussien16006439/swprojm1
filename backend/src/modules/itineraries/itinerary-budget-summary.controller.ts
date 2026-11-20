import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { BudgetSummaryQueryDto } from './dto/budget-summary-query.dto';
import { ItinerariesService } from './itineraries.service';

@ApiTags('itinerary budgets')
@Controller('itineraries')
export class ItineraryBudgetSummaryController {
  constructor(private readonly itinerariesService: ItinerariesService) {}

  @Get(':id/budget-summary')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Get converted budget totals by category, day, and city group (ITN-14, ITN-18)' })
  @ApiQuery({ name: 'currency', required: false, example: 'EUR' })
  @ApiOkResponse({ description: 'Currency-converted budget summary and exchange-rate date' })
  @ApiBadRequestResponse({ description: 'Unsupported target or source currency' })
  @ApiNotFoundResponse({ description: 'Itinerary not found or not visible to this user' })
  getSummary(
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() query: BudgetSummaryQueryDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.itinerariesService.getBudgetSummary(id, query, user);
  }
}
