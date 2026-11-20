import { PartialType } from '@nestjs/swagger';
import { CreateItineraryBudgetDto } from './create-itinerary-budget.dto';

export class UpdateItineraryBudgetDto extends PartialType(CreateItineraryBudgetDto) {}
