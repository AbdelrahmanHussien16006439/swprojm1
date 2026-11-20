import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ExchangeRatesService } from './exchange-rates.service';

class LatestExchangeRatesResponse {
  @ApiProperty({ example: '2026-11-17T00:00:00.000Z' })
  date!: Date;

  @ApiProperty({ example: 'USD' })
  base!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { EUR: 0.92, GBP: 0.79 },
  })
  rates!: Record<string, number>;
}

@ApiTags('exchange rates')
@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Get('latest')
  @ApiOperation({ summary: 'Get the latest cached exchange rates (ITN-18)' })
  @ApiOkResponse({ type: LatestExchangeRatesResponse })
  @ApiServiceUnavailableResponse({
    description: 'No exchange-rate cache is available yet',
  })
  async getLatest(): Promise<LatestExchangeRatesResponse> {
    const latest = await this.exchangeRatesService.getLatest();
    return {
      date: latest.date,
      base: latest.base,
      rates: Object.fromEntries(latest.rates),
    };
  }
}
