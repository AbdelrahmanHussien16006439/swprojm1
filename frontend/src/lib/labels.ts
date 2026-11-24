import type { Role } from "@/types/api";

/** Human names for roles (shared by the admin pages and anyone who shows a role). */
export const ROLE_LABELS: Record<Role, string> = {
  user: "Traveller",
  admin: "Admin",
  airline_moderator: "Airline moderator",
  hotel_moderator: "Hotel moderator",
};

/** Same password rule as the backend (ACC-01): 8+ characters with a letter and a digit. */
export const PASSWORD_HINT = "At least 8 characters, with at least one letter and one number.";

export function isValidPassword(value: string): boolean {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}
