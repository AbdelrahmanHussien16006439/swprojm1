import { FilterQuery, Model, PopulateOptions, SortOrder } from 'mongoose';

// GEN-05: every list uses a fixed page size of 10
export const PAGE_SIZE = 10;

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginateOptions {
  sort?: Record<string, SortOrder>;
  select?: string | Record<string, 0 | 1>;
  populate?: string | PopulateOptions | (string | PopulateOptions)[];
}

/** Builds the standard paginated response — use it when you count/fetch yourself (e.g. aggregations). */
export function toPaginated<T>(
  data: T[],
  total: number,
  page = 1,
): Paginated<T> {
  return {
    data,
    page,
    limit: PAGE_SIZE,
    total,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

/**
 * Runs a paginated find on a model.
 * Example: paginate(this.flightModel, { status: 'scheduled' }, dto.page, { sort: { departureTime: 1 } })
 */
export async function paginate<T>(
  model: Model<T>,
  filter: FilterQuery<T>,
  page = 1,
  options: PaginateOptions = {},
): Promise<Paginated<T>> {
  const currentPage = Math.max(1, Math.floor(page));
  const query = model
    .find(filter)
    .sort(options.sort ?? { createdAt: -1 })
    .skip((currentPage - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE);
  if (options.select) query.select(options.select);
  if (options.populate) query.populate(options.populate as PopulateOptions);

  const [data, total] = await Promise.all([
    query.exec(),
    model.countDocuments(filter).exec(),
  ]);
  return toPaginated(data as T[], total, currentPage);
}
