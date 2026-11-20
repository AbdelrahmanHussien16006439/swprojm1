// FLT-03, FLT-30: persisted flight lifecycle values.
export enum FlightStatus {
  SCHEDULED = 'scheduled',
  CANCELLED = 'cancelled',
  DEPARTED = 'departed',
}

// FLT-04: each cabin class may be used once per flight.
export enum CabinClass {
  ECONOMY = 'economy',
  PREMIUM_ECONOMY = 'premium_economy',
  BUSINESS = 'business',
  FIRST = 'first',
}
