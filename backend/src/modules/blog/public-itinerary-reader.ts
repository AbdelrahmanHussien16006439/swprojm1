import { Injectable } from '@nestjs/common';

/** Injection token for M7's future public-itinerary author query. */
export const PUBLIC_ITINERARY_READER = Symbol('PUBLIC_ITINERARY_READER');

/**
 * M7 has not exported an Itinerary model or service in this checkout.
 * The author profile returns null for itineraries until that integration is
 * available; this stub deliberately does not invent itinerary data or rules.
 */
export interface PublicItineraryReader {
  listPublicByAuthor(authorId: string, page: number): Promise<null>;
}

@Injectable()
export class PendingPublicItineraryReader implements PublicItineraryReader {
  async listPublicByAuthor(_authorId: string, _page: number): Promise<null> {
    return null;
  }
}
