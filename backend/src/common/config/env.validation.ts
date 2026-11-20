const REQUIRED_ENV_VARS = ['MONGODB_URI', 'JWT_ACCESS_SECRET'];

/** Fails fast on startup if a required .env value is missing. */
export function validateEnv(config: Record<string, unknown>) {
  const missing = REQUIRED_ENV_VARS.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Copy .env.example to backend/.env and fill them in.`,
    );
  }
  return config;
}
