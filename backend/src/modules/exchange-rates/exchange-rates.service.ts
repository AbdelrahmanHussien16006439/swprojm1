import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ExchangeRate,
  ExchangeRateDocument,
} from './schemas/exchange-rate.schema';
import { ReferenceDataService } from '../reference-data/reference-data.service';

interface FxRatesApiResponse {
  success: boolean;
  base: string;
  date?: string;
  timestamp?: number;
  rates: Record<string, number>;
}

const FX_RATES_API_URL = 'https://api.fxratesapi.com/latest';
const FX_API_TIMEOUT_MS = 10_000;

@Injectable()
export class ExchangeRatesService implements OnModuleInit {
  private readonly logger = new Logger(ExchangeRatesService.name);
  private refreshInProgress = false;

  constructor(
    @InjectModel(ExchangeRate.name)
    private readonly exchangeRateModel: Model<ExchangeRate>,
    private readonly configService: ConfigService,
    private readonly referenceDataService: ReferenceDataService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      if (!(await this.findRateForToday())) {
        await this.refreshRates();
      }
    } catch {
      // Startup must remain available when FXRatesAPI or the cache is unavailable.
      this.logger.warn(
        'Could not check for today’s exchange rates; cached rates remain available.',
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async refreshRates(): Promise<void> {
    if (this.refreshInProgress) return;
    this.refreshInProgress = true;

    try {
      const apiKey = this.configService.get<string>('FXRATES_API_KEY');
      if (!apiKey) {
        this.logger.warn(
          'FXRATES_API_KEY is not configured; keeping cached exchange rates.',
        );
        return;
      }

      const url = new URL(FX_RATES_API_URL);
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('base', 'USD');
      url.searchParams.set('resolution', '1d');
      url.searchParams.set('format', 'json');

      const response = await fetch(url, {
        signal: AbortSignal.timeout(FX_API_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error('FXRatesAPI returned an error status');

      const payload = (await response.json()) as FxRatesApiResponse;
      const rates = this.validateRatesPayload(payload);
      const suppliedDate = payload.date
        ? new Date(payload.date)
        : payload.timestamp
          ? new Date(payload.timestamp * 1000)
          : new Date();
      if (Number.isNaN(suppliedDate.getTime())) {
        throw new Error('FXRatesAPI returned an invalid date');
      }

      const date = this.utcDay(suppliedDate);
      await this.exchangeRateModel
        .findOneAndUpdate(
          { date, base: payload.base.toUpperCase() },
          {
            $set: {
              date,
              base: payload.base.toUpperCase(),
              rates,
              fetchedAt: new Date(),
            },
          },
          { new: true, upsert: true, setDefaultsOnInsert: true },
        )
        .exec();
    } catch {
      // Never log the URL, response body, or exception: each could contain secrets.
      this.logger.warn(
        'Exchange-rate refresh failed; continuing to use the latest cached rates.',
      );
    } finally {
      this.refreshInProgress = false;
    }
  }

  async convert(
    amount: number,
    from: string,
    to: string,
  ): Promise<{ amount: number; rate: number; rateDate: Date }> {
    if (!Number.isFinite(amount)) {
      throw new BadRequestException('amount must be a finite number');
    }

    const latest = await this.getLatest();
    const fromCode = this.normalizeCurrency(from);
    const toCode = this.normalizeCurrency(to);
    await this.assertSupportedCurrencies([fromCode, toCode], latest);

    const rates = Object.fromEntries(latest.rates);
    const fromRate = fromCode === latest.base ? 1 : rates[fromCode];
    const toRate = toCode === latest.base ? 1 : rates[toCode];
    if (!Number.isFinite(fromRate) || !Number.isFinite(toRate)) {
      throw new BadRequestException(
        'A cached exchange rate is not available for one of these currencies',
      );
    }

    const rate = toRate / fromRate;
    return { amount: amount * rate, rate, rateDate: latest.date };
  }

  async getLatest(): Promise<ExchangeRateDocument> {
    const latest = await this.exchangeRateModel
      .findOne()
      .sort({ date: -1, fetchedAt: -1 })
      .exec();
    if (!latest) {
      throw new ServiceUnavailableException(
        'Exchange rates are not available yet',
      );
    }
    return latest;
  }

  private async findRateForToday(): Promise<ExchangeRateDocument | null> {
    const today = this.utcDay(new Date());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    return this.exchangeRateModel
      .findOne({ date: { $gte: today, $lt: tomorrow } })
      .sort({ fetchedAt: -1 })
      .exec();
  }

  private validateRatesPayload(payload: FxRatesApiResponse): Map<string, number> {
    if (
      !payload?.success ||
      typeof payload.base !== 'string' ||
      !/^[A-Z]{3}$/i.test(payload.base) ||
      !payload.rates ||
      typeof payload.rates !== 'object'
    ) {
      throw new Error('FXRatesAPI returned an invalid payload');
    }

    const rates = new Map<string, number>();
    for (const [currency, rate] of Object.entries(payload.rates)) {
      const code = currency.toUpperCase();
      if (!/^[A-Z]{3}$/.test(code) || !Number.isFinite(rate) || rate <= 0) {
        throw new Error('FXRatesAPI returned an invalid rate');
      }
      rates.set(code, rate);
    }
    return rates;
  }

  private normalizeCurrency(currency: string): string {
    const code = currency?.trim().toUpperCase();
    if (!code || !/^[A-Z]{3}$/.test(code)) {
      throw new BadRequestException('Currency must be a 3-letter code');
    }
    return code;
  }

  private async assertSupportedCurrencies(
    currencies: string[],
    latest: ExchangeRateDocument,
  ): Promise<void> {
    const rates = Object.fromEntries(latest.rates);
    for (const currency of currencies) {
      const supported = await this.referenceDataService.isSupportedCurrency(
        currency,
      );
      if (!supported) {
        throw new BadRequestException(`Unsupported currency: ${currency}`);
      }
    }
  }

  private utcDay(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }
}
