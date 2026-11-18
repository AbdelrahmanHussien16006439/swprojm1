import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { CreateAirlineDto } from './dto/create-airline.dto';
import { UpdateAirlineDto } from './dto/update-airline.dto';
import { AirlinesService } from './airlines.service';

@ApiTags('airlines')
@Controller('airlines')
export class AirlinesController {
  constructor(private readonly airlinesService: AirlinesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Create an airline (FLT-01)' })
  @ApiCreatedResponse({ description: 'Airline created' })
  @ApiBadRequestResponse({ description: 'Invalid airline fields' })
  @ApiConflictResponse({ description: 'Airline code already exists' })
  create(@Body() dto: CreateAirlineDto) {
    return this.airlinesService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an airline profile (FLT-01)' })
  @ApiOkResponse({ description: 'Airline profile' })
  @ApiNotFoundResponse({ description: 'Airline not found' })
  get(@Param('id', ParseObjectIdPipe) id: string) {
    return this.airlinesService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AIRLINE_MODERATOR)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Edit my airline profile (FLT-01)' })
  @ApiOkResponse({ description: 'Airline updated' })
  @ApiBadRequestResponse({ description: 'Invalid airline fields' })
  @ApiConflictResponse({ description: 'Airline code already exists' })
  @ApiNotFoundResponse({ description: 'Airline not found' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateAirlineDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.airlinesService.update(id, dto, user);
  }
}
