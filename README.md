# Travel Planning and Booking Platform

Software Project I — Winter 2026 (German International University).
A web platform that combines flight booking, hotel booking, itinerary planning & budgeting, and a travel blog/community.

**Current phase: Milestone 1 — backend only** (NestJS + MongoDB Atlas + Swagger), due 20/11/2026.

- Team plan (conventions, ownership, every endpoint and rule): [`docs/TEAM_PLAN.md`](docs/TEAM_PLAN.md)
- PR self-check prompts (run yours before opening a PR): [`docs/PR_CHECK_PROMPTS.md`](docs/PR_CHECK_PROMPTS.md)
- Official project description: [`docs/proj_description.md`](docs/proj_description.md)
- Official requirements: [`docs/requirements/`](docs/requirements/)

## Actors

| Actor | Role value | Summary |
| ----- | ---------- | ------- |
| Guest | — | Search flights & hotels, browse published posts and public itineraries |
| Registered user | `user` | Bookings, payments, itineraries & budgets, posts, comments, likes, reviews, reports |
| Administrator | `admin` | Seeded only. Moderators, account suspension, provider deactivation, reports, audit log |
| Airline moderator | `airline_moderator` | Manages exactly one airline and its flights |
| Hotel moderator | `hotel_moderator` | Manages exactly one hotel and its rooms |

## Tech stack

| Layer      | Technology                                         |
| ---------- | -------------------------------------------------- |
| Model      | MongoDB Atlas + Mongoose schemas                   |
| Controller | NestJS 11 controllers (REST API under `/api`)      |
| View       | Next.js (Milestone 2)                              |
| API docs   | Swagger UI at `/api/docs`                          |
| Auth       | JWT in httpOnly cookies + server-side sessions     |
| Payments   | Stripe test mode                                   |
| FX rates   | FXRatesAPI (backend only, cached daily)            |

## Prerequisites

- **Node.js LTS** (20 or 22) and **npm** — check with `node -v` and `npm -v`
- **Git**
- Access to the shared MongoDB Atlas cluster (the team leader adds your IP / sends the connection string privately)

## Setup

```bash
git clone https://github.com/AbdelrahmanHussien16006439/swprojm1.git
cd swprojm1
git checkout develop
cd backend
npm install
cp ../.env.example .env        # Windows cmd: copy ..\.env.example .env
```

Then open `backend/.env` and fill in the values the team leader sends you privately. **Never commit `.env`.**

### Environment variables

| Variable | Used by | What it is |
| -------- | ------- | ---------- |
| `PORT` | `main.ts` | Port the API listens on (default `4000`) |
| `FRONTEND_URL` | `main.ts` | Origin allowed by CORS with cookies (Milestone 2 frontend, default `http://localhost:3000`) |
| `MONGODB_URI` | `app.module.ts`, seeds | Shared Atlas connection string (`mongodb+srv://...`). **Required** |
| `JWT_ACCESS_SECRET` | auth | Secret for signing access tokens — a long random string. **Required** |
| `ADMIN_NAME` | admin seed | Name of the seeded administrator |
| `ADMIN_EMAIL` | admin seed | Email of the seeded administrator |
| `ADMIN_PASSWORD` | admin seed | Password of the seeded administrator (≥ 8 characters, a letter and a digit) |
| `PLATFORM_CURRENCY` | payments | The single currency for all flight/hotel prices and payments (e.g. `USD`) |
| `STRIPE_SECRET_KEY` | payments | Stripe **test** secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | payments | Stripe webhook signing secret (`whsec_...`) |
| `FXRATES_API_KEY` | exchange rates | FXRatesAPI key — used only by the backend |

The app refuses to start if a **required** variable is missing.

### Admin account (ACC-18)

Admins cannot register; they are created by a seed script. **The team leader runs this once on the shared database** — other members don't need to:

```bash
npm run seed:admin    # uses ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD, safe to re-run
```

### Run

```bash
npm run start:dev
```

- API: http://localhost:4000/api
- Swagger UI: **http://localhost:4000/api/docs**

## Testing in Swagger

1. Call `POST /api/auth/register` to create a user (or use the admin credentials for admin endpoints).
2. Call `POST /api/auth/login`. The response contains only the user — the tokens are set as **httpOnly cookies** (`access_token`, `refresh_token`).
3. The browser sends those cookies automatically on every following Swagger request — there is no "Authorize" token to paste.
4. `POST /api/auth/refresh` issues a new access token (it lasts 15 minutes). A session expires after 30 minutes without an authenticated request.
5. `POST /api/auth/logout` ends the session.

To switch user, log out and log in with the other account.

## Testing payments (Stripe test mode)

Payments use Stripe **test mode** only; no real money is involved.

1. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli).
2. Forward webhooks to the API (keep this window open while testing):
   ```bash
   stripe listen --api-key <STRIPE_SECRET_KEY> --events payment_intent.succeeded,payment_intent.payment_failed,payment_intent.canceled,charge.refunded,refund.created,refund.updated --forward-to localhost:4000/api/payments/webhook
   ```
   Put the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET` and restart the API.
3. In Swagger: hold a flight (`POST /api/flight-bookings/hold`) or hotel (`POST /api/hotel-bookings`) → `POST /api/bookings/{type}/{id}/accept-policies` with `{"accepted": true}` → `POST /api/payments` with `{"bookingType": "flight" | "hotel", "bookingId": "...", "testPaymentMethod": "pm_card_visa"}`.
4. A few seconds later the webhook confirms the booking (status `confirmed` + booking reference + notification). Use `pm_card_chargeDeclined` to test a failed payment and `POST /api/payments/{id}/retry`.

## Scripts (run inside `backend/`)

| Command              | What it does                         |
| -------------------- | ------------------------------------ |
| `npm run start:dev`  | Start the API with hot reload        |
| `npm run build`      | Compile to `dist/`                   |
| `npm test`           | Unit tests (Jest)                    |
| `npm run lint`       | ESLint (auto-fix)                    |
| `npm run format`     | Prettier                             |
| `npm run seed:admin` | Seed the administrator (ACC-18)      |
| `npm run seed:reference` | Seed countries, cities, airports, currencies and attractions from `docs/requirements/reference-data/` (team leader runs it once on the shared database) |

## Common problems

| Error | Cause / fix |
| ----- | ----------- |
| `querySrv ECONNREFUSED` / `querySrv ETIMEOUT` | Your DNS server refuses Atlas SRV lookups. Pull the latest `develop` (it uses public DNS servers for the lookup). You can keep the normal `mongodb+srv://` string. |
| Server hangs while connecting / SRV or TXT lookups blocked | Some networks block DNS SRV/TXT records. Use the non-SRV string instead: `mongodb://USER:PASSWORD@ac-ig9t9k3-shard-00-00.i7gpxlm.mongodb.net:27017,ac-ig9t9k3-shard-00-01.i7gpxlm.mongodb.net:27017,ac-ig9t9k3-shard-00-02.i7gpxlm.mongodb.net:27017/travel-platform?tls=true&authSource=admin&retryWrites=true&w=majority&appName=travel-platform` |
| `bad auth : authentication failed` | Wrong username or password in `MONGODB_URI`. Ask the team leader for the correct string. Special characters in the password must be URL-encoded. |
| `Server selection timed out` / `ENOTFOUND` | Your IP is not on the Atlas network access list, or you are offline. Ask the team leader to add your IP. |
| `Cannot find module '.../dist/main'` | Stale build output. Delete `backend/dist` and any `*.tsbuildinfo` file in `backend/`, then run `npm run start:dev` again. |
| `Missing required environment variables: ...` | `backend/.env` is missing or incomplete — copy `.env.example` again and fill in the values. |
| `EADDRINUSE :::4000` | Another server is already running on port 4000. Stop it (or change `PORT`). |
| `401` on every request in Swagger | You are not logged in, or the session expired after 30 idle minutes. Call `POST /api/auth/login` again. |

## Project structure

```
swprojm1/
├── backend/
│   ├── src/
│   │   ├── main.ts               # /api prefix, Swagger, cookies, validation, error filter (Member 1)
│   │   ├── app.module.ts         # registers every module — only Member 1 edits it
│   │   ├── common/               # shared code (Member 1)
│   │   │   ├── config/           # .env validation
│   │   │   ├── constants/        # cookie names
│   │   │   ├── decorators/       # @Roles, @CurrentUser, @AllowPasswordChangeRequired
│   │   │   ├── dto/              # PaginationQueryDto, ConfirmActionDto
│   │   │   ├── enums/            # Role, UserStatus, ProviderType
│   │   │   ├── filters/          # global error format
│   │   │   ├── guards/           # JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard
│   │   │   ├── interfaces/       # JwtUser, AuthenticatedRequest
│   │   │   ├── pipes/            # ParseObjectIdPipe
│   │   │   ├── utils/            # paginate(), auth cookies, transforms, escapeRegex
│   │   │   └── validators/       # @IsValidPassword (ACC-01 rule)
│   │   ├── modules/              # one folder per feature module, one owner each
│   │   └── seeds/                # seed scripts (admin.seed.ts)
│   └── uploads/                  # uploaded images (git-ignored), served at /uploads
├── frontend/                     # Milestone 2
├── docs/
│   ├── TEAM_PLAN.md
│   ├── PR_CHECK_PROMPTS.md
│   ├── proj_description.md
│   ├── requirements/             # official requirement CSVs
│   └── api/
├── AI_PROMPTS.txt                # AI usage log — add entries at the bottom
├── README.md
├── .env.example                  # template for backend/.env
├── .gitattributes
└── .gitignore
```

Each module follows the same layout:

```
modules/<module>/
├── <module>.module.ts
├── <module>.controller.ts
├── <module>.service.ts
├── <module>.constants.ts     # rule values from the sheet, with requirement IDs
├── schemas/<entity>.schema.ts
└── dto/*.dto.ts
```

### Module ownership

| Member | Modules                                                             |
| ------ | ------------------------------------------------------------------- |
| 1      | `auth`, `users`, `admin-accounts`, `audit-logs` (+ `common/`, `main.ts`, `app.module.ts`, seeds) |
| 2      | `blog`, `reports`, `admin-moderation`, `uploads`, `exchange-rates`  |
| 3      | `airlines`, `flights`                                               |
| 4      | `flight-bookings`, `payments`                                       |
| 5      | `reference-data`, `hotels`                                          |
| 6      | `hotel-bookings`, `reviews`, `notifications`, `admin-bookings`      |
| 7      | `itineraries`                                                       |

Only edit your own folders. If you need a change in someone else's module, ask its owner.

## Using auth in your module

```ts
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { Role } from '../../common/enums/role.enum';

@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AIRLINE_MODERATOR)
@Post()
create(@Body() dto: CreateFlightDto, @CurrentUser() user: JwtUser) {
  return this.flightsService.create(dto, user);
}
```

- `JwtAuthGuard` only → any logged-in user. Add `@Roles(...)` + `RolesGuard` → only those roles. No guard → public.
- `OptionalJwtAuthGuard` → public, but `user` is set when logged in.
- Validate `:id` params with `ParseObjectIdPipe`. Paginate lists with `paginate()` from `common/utils/pagination.ts` (page size 10).
- Use `import type { JwtUser }` (the project uses `isolatedModules`, so types in decorated signatures need `import type`).

Errors always have this shape:

```json
{ "statusCode": 400, "error": "Bad Request", "message": ["password must contain at least one digit"], "path": "/api/auth/register", "timestamp": "..." }
```

## Member 1 endpoints

| Method | Endpoint                               | Req              | Who        |
| ------ | -------------------------------------- | ---------------- | ---------- |
| POST   | `/api/auth/register`                   | ACC-01           | Guest      |
| POST   | `/api/auth/login`                      | ACC-04, ACC-05   | Guest      |
| POST   | `/api/auth/refresh`                    | ACC-06, ACC-19   | Refresh cookie |
| POST   | `/api/auth/logout`                     | ACC-06           | Logged in  |
| PATCH  | `/api/auth/change-password`            | ACC-08           | Logged in  |
| GET    | `/api/auth/me`                         | ACC-04, ACC-19   | Logged in  |
| GET    | `/api/users/me`                        | ACC-11           | Logged in  |
| PATCH  | `/api/users/me`                        | ACC-09           | Logged in  |
| DELETE | `/api/users/me`                        | ACC-12           | User       |
| POST   | `/api/admin/moderators`                | ACC-13           | Admin      |
| GET    | `/api/admin/accounts`                  | ACC-14           | Admin      |
| PATCH  | `/api/admin/accounts/:id/suspend`      | ACC-15, ACC-16   | Admin      |
| PATCH  | `/api/admin/accounts/:id/reactivate`   | ACC-15, ACC-16   | Admin      |
| POST   | `/api/admin/users/:id/reset-password`  | ACC-07a          | Admin      |

## Git workflow

- `main` = stable milestone releases, `develop` = integration. Never commit directly to either.
- One branch per task, created from the latest `develop`:
  ```bash
  git checkout develop
  git pull origin develop
  git checkout -b feature/FLT-03-create-flight
  ```
- Branch names: `feature/<REQ-ID>-<description>`, `fix/<REQ-ID>-<description>`, `docs/<description>`.
- Conventional commits with requirement IDs: `feat(flights): create flight endpoint (FLT-03)`.
- Before opening a PR: `git pull origin develop`, `npm run build`, `npm test`, and run your prompt from [`docs/PR_CHECK_PROMPTS.md`](docs/PR_CHECK_PROMPTS.md).
- Open a PR into **`develop`** (not `main`); the team leader reviews and merges.
- Never commit `.env`, keys or the Mongo connection string.
- Log AI usage at the bottom of [`AI_PROMPTS.txt`](AI_PROMPTS.txt) (format at the top of the file).
- Everything must be merged into `develop` by **19/11**; the team leader merges `develop` → `main` that night.
