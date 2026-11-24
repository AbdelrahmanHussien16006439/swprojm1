// Server-side API helper (Member 1). Use it in Server Components (page.tsx / layout.tsx).
import { cookies } from "next/headers";
import { ApiError, toApiError, toQueryString } from "./errors";

export { ApiError };

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

interface ServerGetOptions {
  query?: Record<string, unknown>;
  /**
   * Default true: sends the visitor's login cookies, so the page is rendered per request (SSR).
   * Use false on public ISR pages (published post, public itinerary, author page) so they can be cached.
   */
  auth?: boolean;
  /** Seconds to keep the response cached (ISR). Only used together with auth: false. */
  revalidate?: number;
}

async function get<T>(path: string, options: ServerGetOptions = {}): Promise<T> {
  const { query, auth = true, revalidate } = options;
  const url = `${BACKEND_URL}/api${path}${toQueryString(query)}`;

  let init: RequestInit & { next?: { revalidate?: number } };
  if (auth) {
    const cookieHeader = (await cookies()).toString();
    init = { headers: cookieHeader ? { cookie: cookieHeader } : {}, cache: "no-store" };
  } else {
    init = revalidate !== undefined ? { next: { revalidate } } : { cache: "no-store" };
  }

  const res = await fetch(url, init);
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as T;
}

/** Example: const posts = await serverApi.get<Paginated<Post>>("/posts", { query: { page } }); */
export const serverApi = { get };
