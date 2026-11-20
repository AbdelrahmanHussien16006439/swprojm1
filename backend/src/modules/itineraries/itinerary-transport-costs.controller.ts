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
import { UpdateItineraryTransportCostDto } from './dto/update-itinerary-transport-cost.dto';
import { ItinerariesService } from './itineraries.service';

@ApiTags('itinerary transport costs')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER)
@Controller('transport-costs')
export class ItineraryTransportCostsController {
  constructor(private readonly itinerariesService: ItinerariesService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a transport cost (ITN-16)' })
  @ApiOkResponse({ description: 'Transport cost updated and city-group subtotal recalculated' })
  @ApiBadRequestResponse({ description: 'Invalid amount, city, or unsupported currency' })
  @ApiNotFoundResponse({ description: 'Transport cost or itinerary day not found' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateItineraryTransportCostDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.itinerariesService.updateTransportCost(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a transport cost (ITN-16)' })
  @ApiOkResponse({ description: 'Transport cost deleted and city-group subtotal recalculated' })
  @ApiNotFoundResponse({ description: 'Transport cost not found' })
  delete(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.itinerariesService.deleteTransportCost(id, user);
  }
}
