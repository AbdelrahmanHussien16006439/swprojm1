import type { ApiErrorBody } from "@/types/api";

/** Thrown by api (client) and serverApi (server) for every non-2xx response. */
export class ApiError extends Error {
  readonly status: number;
  /** The backend's messages, e.g. ["title must be at most 100 characters"] (GEN-02). */
  readonly messages: string[];

  constructor(status: number, messages: string[]) {
    super(messages.join(" ") || `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.messages = messages.length ? messages : [`Request failed (${status})`];
  }
}

export async function toApiError(res: Response): Promise<ApiError> {
  let messages: string[] = [];
  try {
    const body = (await res.json()) as Partial<ApiErrorBody>;
    if (Array.isArray(body.message)) messages = body.message;
    else if (typeof body.message === "string") messages = [body.message];
  } catch {
    // Not JSON (for example the backend is down): use a generic message below.
  }
  if (!messages.length) {
    messages = [
      res.status >= 500
        ? "Something went wrong on the server. Please try again."
        : `Request failed (${res.status})`,
    ];
  }
  return new ApiError(res.status, messages);
}

/** Turns anything that was thrown into user-friendly messages. */
export function errorMessages(error: unknown): string[] {
  if (error instanceof ApiError) return error.messages;
  if (error instanceof Error) return [error.message];
  return ["Something went wrong. Please try again."];
}

/** Builds "?a=1&b=2" from an object, skipping empty values. Arrays repeat the key. */
export function toQueryString(query?: Record<string, unknown>): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) value.forEach((v) => params.append(key, String(v)));
    else params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
