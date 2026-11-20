export const STRIPE_CLIENT = 'STRIPE_CLIENT';

// Stripe amounts use the currency's minor unit. These are ISO currency exceptions
// to the usual two decimal places; the platform currency is configured once.
export const STRIPE_ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG',
  'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);
export const STRIPE_THREE_DECIMAL_CURRENCIES = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']);
