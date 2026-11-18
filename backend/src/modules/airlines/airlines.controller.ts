import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCookieAuth,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
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
import { UpdateBaggagePolicyDto } from './dto/update-baggage-policy.dto';
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

  @Put(':id/baggage-policy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AIRLINE_MODERATOR)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Update my airline baggage policy (FLT-08)' })
  @ApiOkResponse({ description: 'Baggage policy updated' })
  @ApiBadRequestResponse({ description: 'Invalid baggage policy values' })
  @ApiNotFoundResponse({ description: 'Airline not found or not owned by user' })
  updateBaggagePolicy(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateBaggagePolicyDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.airlinesService.updateBaggagePolicy(id, dto, user);
  }

  @Post(':id/logo')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AIRLINE_MODERATOR)
  @ApiCookieAuth('access_token')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiOperation({ summary: 'Upload or replace my airline logo (FLT-01, GEN-08)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ description: 'Airline logo uploaded or replaced' })
  @ApiBadRequestResponse({ description: 'Invalid airline id or JPG/PNG file' })
  @ApiPayloadTooLargeResponse({ description: 'Logo exceeds 5 MB' })
  @ApiNotFoundResponse({ description: 'Airline not found or not owned by user' })
  uploadLogo(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: JwtUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.airlinesService.uploadLogo(id, user, file);
  }
}
