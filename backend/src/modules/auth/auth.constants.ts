// ACC-19: short-lived access token (JWT in an httpOnly cookie)
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

// ACC-19: refresh cookie lifetime — the server still expires the session after 30 idle minutes (ACC-06)
export const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// ACC-05: lock the account for 15 minutes after 5 consecutive failed logins
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

// ACC-04: generic message so attackers can't tell which part was wrong
export const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
