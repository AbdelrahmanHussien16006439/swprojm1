import { PartialType } from '@nestjs/swagger';
import { CreateItineraryTransportCostDto } from './create-itinerary-transport-cost.dto';

export class UpdateItineraryTransportCostDto extends PartialType(CreateItineraryTransportCostDto) {}
