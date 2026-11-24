import type { NextConfig } from "next";

// Where the NestJS backend runs (frontend/.env.local). Only the Next.js server uses it.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // We use the classic caching model on purpose (TEAM_PLAN M2.6):
  // `export const revalidate = 60` = ISR, `export const dynamic = "force-dynamic"` = SSR.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The browser only talks to this Next.js server. /api and /uploads are forwarded to the
  // backend, so the backend's httpOnly login cookies work without CORS (same origin).
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      { source: "/uploads/:path*", destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
