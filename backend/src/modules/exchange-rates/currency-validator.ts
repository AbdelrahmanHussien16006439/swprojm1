/**
 * Integration seam for Member 5's Currency reference data. Once that service
 * is available, bind this token to an adapter around isSupportedCurrency().
 */
export const SUPPORTED_CURRENCY_VALIDATOR = Symbol(
  'SUPPORTED_CURRENCY_VALIDATOR',
);

export interface SupportedCurrencyValidator {
  isSupportedCurrency(code: string): Promise<boolean>;
}
