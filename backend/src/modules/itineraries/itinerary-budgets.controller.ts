import { Body, Controller, Delete, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
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
import { UpdateItineraryBudgetDto } from './dto/update-itinerary-budget.dto';
import { ItinerariesService } from './itineraries.service';

@ApiTags('itinerary budgets')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER)
@Controller('budgets')
export class ItineraryBudgetsController {
  constructor(private readonly itinerariesService: ItinerariesService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a budget entry (ITN-14)' })
  @ApiOkResponse({ description: 'Budget entry updated and city-group subtotal recalculated' })
  @ApiBadRequestResponse({ description: 'Invalid amount, category, or unsupported currency' })
  @ApiNotFoundResponse({ description: 'Budget entry not found' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateItineraryBudgetDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.itinerariesService.updateBudgetEntry(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a budget entry (ITN-14)' })
  @ApiOkResponse({ description: 'Budget entry deleted and city-group subtotal recalculated' })
  @ApiNotFoundResponse({ description: 'Budget entry not found' })
  delete(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.itinerariesService.deleteBudgetEntry(id, user);
  }
}
