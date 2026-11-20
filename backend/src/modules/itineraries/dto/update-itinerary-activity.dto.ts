import { PartialType } from '@nestjs/swagger';
import { CreateItineraryActivityDto } from './create-itinerary-activity.dto';

export class UpdateItineraryActivityDto extends PartialType(CreateItineraryActivityDto) {}
