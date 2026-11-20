// ITN-05: an itinerary may contain no more than 60 days.
export const MAX_ITINERARY_DAYS = 60;

// ITN-05: itinerary dates are calendar days represented as UTC midnight dates.
export const MILLISECONDS_PER_CALENDAR_DAY = 24 * 60 * 60 * 1000;

// ITN-12: at most five uploaded images may be attached to an activity.
export const MAX_ACTIVITY_IMAGES = 5;
