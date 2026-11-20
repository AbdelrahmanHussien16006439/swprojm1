import { TransformFnParams } from 'class-transformer';

/** Use with @Transform(trimLowerCase) — e.g. emails. */
export const trimLowerCase = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Use with @Transform(trimUpperCase) — e.g. currency codes. */
export const trimUpperCase = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
