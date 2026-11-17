import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { ExchangeRate } from './schemas/exchange-rate.schema';
import { ExchangeRatesService } from './exchange-rates.service';

function makeCachedRate(date = new Date()): ExchangeRate {
  return {
    date,
    base: 'USD',
    rates: new Map([
      ['USD', 1],
      ['EUR', 0.9],
      ['GBP', 0.8],
    ]),
    fetchedAt: date,
  } as ExchangeRate;
}

function createService(options?: {
  latest?: ExchangeRate | null;
  today?: ExchangeRate | null;
  apiKey?: string;
  validator?: { isSupportedCurrency: jest.Mock };
}) {
  const latest = options && 'latest' in options ? options.latest : makeCachedRate();
  const today = options && 'today' in options ? options.today : latest;
  const findOne = jest
    .fn()
    .mockReturnValueOnce({
      sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(today) }),
    })
    .mockReturnValue({
      sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(latest) }),
    });
  const findOneAndUpdate = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(latest),
  });
  const model = { findOne, findOneAndUpdate } as unknown as Model<ExchangeRate>;
  const config = {
    get: jest.fn().mockReturnValue(options?.apiKey ?? 'test-api-key'),
  } as unknown as ConfigService;
  const service = new ExchangeRatesService(model, config, options?.validator);
  return { service, findOne, findOneAndUpdate, config };
}

describe('ExchangeRatesService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('converts between currencies using the latest cached base rates', async () => {
    const { service } = createService();

    await expect(service.convert(90, 'EUR', 'GBP')).resolves.toEqual({
      amount: 80,
      rate: 0.8 / 0.9,
      rateDate: expect.any(Date),
    });
  });

  it('returns HTTP 400 for a currency absent from the cache when no reference validator is wired', async () => {
    const { service } = createService();

    await expect(service.convert(1, 'USD', 'ZZZ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns 503 when no cached rates are available', async () => {
    const { service } = createService({ latest: null, today: null });

    await expect(service.getLatest()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('uses Member 5 currency validation when the integration is wired', async () => {
    const validator = {
      isSupportedCurrency: jest.fn().mockResolvedValue(false),
    };
    const { service } = createService({ validator });

    await expect(service.convert(1, 'USD', 'EUR')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(validator.isSupportedCurrency).toHaveBeenCalledWith('USD');
  });

  it('skips startup fetching when today already has cached rates', async () => {
    const { service, findOne, findOneAndUpdate } = createService();
    const fetchSpy = jest.spyOn(global, 'fetch');

    await service.onModuleInit();

    expect(findOne).toHaveBeenCalledTimes(1);
    expect(findOneAndUpdate).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches and stores rates on startup when today has no cache', async () => {
    const { service, findOneAndUpdate } = createService({ today: null });
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        base: 'USD',
        date: new Date().toISOString(),
        rates: { EUR: 0.9 },
      }),
    } as Response);

    await service.onModuleInit();

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ base: 'USD' }),
      expect.objectContaining({
        $set: expect.objectContaining({ base: 'USD', rates: new Map([['EUR', 0.9]]) }),
      }),
      expect.objectContaining({ upsert: true }),
    );
  });

  it('keeps cached rates available when the provider request fails', async () => {
    const { service } = createService();
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'));

    await expect(service.refreshRates()).resolves.toBeUndefined();
    await expect(service.getLatest()).resolves.toEqual(expect.any(Object));
  });
});
