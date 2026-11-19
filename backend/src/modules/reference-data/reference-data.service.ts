import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { escapeRegex } from '../../common/utils/escape-regex';
import { paginate } from '../../common/utils/pagination';
import { ReferenceDataQueryDto } from './dto/reference-data-query.dto';
import { Airport } from './schemas/airport.schema';
import { Attraction } from './schemas/attraction.schema';
import { City } from './schemas/city.schema';
import { Country } from './schemas/country.schema';
import { Currency } from './schemas/currency.schema';

@Injectable()
export class ReferenceDataService {
  constructor(
    @InjectModel(Country.name) private readonly countryModel: Model<Country>,
    @InjectModel(City.name) private readonly cityModel: Model<City>,
    @InjectModel(Airport.name) private readonly airportModel: Model<Airport>,
    @InjectModel(Currency.name) private readonly currencyModel: Model<Currency>,
    @InjectModel(Attraction.name) private readonly attractionModel: Model<Attraction>,
  ) {}

  async findCountry(id: string) {
    const filter = isValidObjectId(id)
      ? { $or: [{ code: id.toUpperCase() }, { _id: new Types.ObjectId(id) }] }
      : { code: id.toUpperCase() };
    const country = await this.countryModel.findOne(filter).exec();
    if (!country) throw new NotFoundException('Country not found');
    return country;
  }

  async findCity(id: string) {
    const filter = isValidObjectId(id)
      ? { $or: [{ cityId: id.toLowerCase() }, { _id: new Types.ObjectId(id) }] }
      : { cityId: id.toLowerCase() };
    const city = await this.cityModel.findOne(filter).populate('countryId').exec();
    if (!city) throw new NotFoundException('City not found');
    return city;
  }

  async findAirport(id: string) {
    const filter = isValidObjectId(id)
      ? { $or: [{ iataCode: id.toUpperCase() }, { _id: new Types.ObjectId(id) }] }
      : { iataCode: id.toUpperCase() };
    const airport = await this.airportModel
      .findOne(filter)
      .populate('cityId countryId')
      .exec();
    if (!airport) throw new NotFoundException('Airport not found');
    return airport;
  }

  async findAirportsByCity(cityId: string) {
    const city = await this.findCity(cityId);
    return this.airportModel
      .find({ cityId: city._id })
      .populate('cityId countryId')
      .sort({ iataCode: 1 })
      .exec();
  }

  isSupportedCurrency(code: string): Promise<boolean> {
    return this.currencyModel.exists({ code: code.toUpperCase() }).then(Boolean);
  }

  listCurrencies(page = 1) {
    return paginate(this.currencyModel, {}, page, { sort: { code: 1 } });
  }

  listCountries(page = 1) {
    return paginate(this.countryModel, {}, page, { sort: { name: 1 } });
  }

  async listCities(page = 1, countryId?: string) {
    const filter = countryId
      ? { countryId: (await this.findCountry(countryId))._id }
      : {};
    return paginate(this.cityModel, filter, page, {
      sort: { name: 1 },
      populate: 'countryId',
    });
  }

  async listAirports(query: ReferenceDataQueryDto) {
    const filter: Record<string, unknown> = {};
    const and: Record<string, unknown>[] = [];
    const searchText = query.search?.trim();
    if (searchText) {
      const expression = new RegExp(escapeRegex(searchText), 'i');
      const cities = await this.cityModel
        .find({ $or: [{ name: expression }, { cityId: expression }] })
        .select('_id')
        .exec();
      and.push({
        $or: [
          { iataCode: expression },
          { name: expression },
          { cityId: { $in: cities.map((city) => city._id) } },
        ],
      });
    }
    if (query.iataCode) {
      and.push({ iataCode: new RegExp(escapeRegex(query.iataCode.trim()), 'i') });
    }
    if (query.name) {
      and.push({ name: new RegExp(escapeRegex(query.name.trim()), 'i') });
    }
    if (query.countryId) {
      const country = await this.findCountry(query.countryId);
      and.push({ countryId: country._id });
    }
    if (query.city) {
      const expression = new RegExp(escapeRegex(query.city.trim()), 'i');
      const cities = await this.cityModel
        .find({ $or: [{ name: expression }, { cityId: expression }] })
        .select('_id')
        .exec();
      and.push({ cityId: { $in: cities.map((city) => city._id) } });
    }
    if (and.length) filter.$and = and;
    return paginate(this.airportModel, filter, query.page, {
      sort: { iataCode: 1 },
      populate: 'cityId countryId',
    });
  }
}
