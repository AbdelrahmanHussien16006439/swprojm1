// Shared API types (Member 1). Each member keeps their own response types in their components folder.

export type Role = "user" | "admin" | "airline_moderator" | "hotel_moderator";

/** GET /api/auth/me */
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  providerId: string | null;
  mustChangePassword: boolean;
}

/** Every paginated list from the backend (page size 10, GEN-05). */
export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** The backend's error format (TEAM_PLAN 3.10). */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string[] | string;
  path?: string;
  timestamp?: string;
}
