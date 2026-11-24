"use client";

// Browser-side API client (Member 1). Use it in Client Components only.
// Paths are WITHOUT the /api prefix, e.g. api.get("/flights/search", { query: { ... } }).
// Requests go to this Next.js server, which forwards /api to the backend (next.config.ts).
import { ApiError, toApiError, toQueryString } from "./errors";
import { loginUrl } from "@/lib/auth/routes";

export { ApiError };

type Query = Record<string, unknown>;

interface RequestOptions {
  query?: Query;
  body?: unknown;
  /** Default true: on 401, refresh the session once; if that fails, go to the login page (ACC-10, ACC-19). */
  redirectOn401?: boolean;
}

let refreshing: Promise<boolean> | null = null;

/** Only one refresh at a time, even if several requests get 401 together. */
function refreshSession(): Promise<boolean> {
  refreshing ??= fetch("/api/auth/refresh", { method: "POST" })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const { query, body, redirectOn401 = true } = options;
  const url = `/api${path}${toQueryString(query)}`;
  const isForm = body instanceof FormData;

  const send = () =>
    fetch(url, {
      method,
      headers: body !== undefined && !isForm ? { "Content-Type": "application/json" } : undefined,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });

  let res = await send();

  if (res.status === 401 && !path.startsWith("/auth/")) {
    if (await refreshSession()) res = await send();
    if (res.status === 401 && redirectOn401) {
      window.location.href = loginUrl(window.location.pathname + window.location.search);
    }
  }

  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, opts: { query?: Query; redirectOn401?: boolean } = {}) =>
    request<T>("GET", path, opts),
  post: <T>(path: string, body?: unknown, opts: { redirectOn401?: boolean } = {}) =>
    request<T>("POST", path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, { body }),
  delete: <T>(path: string, body?: unknown) => request<T>("DELETE", path, { body }),
  /** Multipart upload (GEN-08), e.g. api.upload("/posts/123/images", formData). */
  upload: <T>(path: string, formData: FormData) => request<T>("POST", path, { body: formData }),
  /** Downloads a file (PDF e-ticket, CSV export) and saves it as fileName. */
  async download(path: string, fileName: string): Promise<void> {
    let res = await fetch(`/api${path}`);
    if (res.status === 401 && (await refreshSession())) res = await fetch(`/api${path}`);
    if (!res.ok) throw await toApiError(res);
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  },
};
