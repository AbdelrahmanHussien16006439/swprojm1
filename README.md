# Travel Planning and Booking Platform

Software Project I — Winter 2026 (German International University).
A web platform for flight booking, hotel booking, itinerary planning & budgeting, and a travel blog.

**Current phase: Milestone 1 — backend only** (NestJS + MongoDB Atlas + Swagger), due 20/11/2026.
The team plan is in [`docs/TEAM_PLAN.md`](docs/TEAM_PLAN.md) and the official description in [`docs/proj_description.md`](docs/proj_description.md).

## Tech stack

| Layer      | Technology                                         |
| ---------- | -------------------------------------------------- |
| Model      | MongoDB Atlas + Mongoose schemas                   |
| Controller | NestJS controllers (REST API under `/api`)         |
| View       | Next.js (Milestone 2)                              |
| Docs       | Swagger UI at `/api/docs`                          |
| Payments   | Stripe test mode                                   |
| FX rates   | FXRatesAPI (backend only, cached daily)            |

## Getting started

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/AbdelrahmanHussien16006439/swprojm1.git
cd swprojm1
git checkout develop
cd backend
npm install
cp ../.env.example .env      # then fill in the values the team leader sends you privately
npm run seed:admin           # creates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD (safe to re-run)
npm run start:dev
```

- API: http://localhost:4000/api
- Swagger UI: http://localhost:4000/api/docs

### Testing in Swagger

1. Call `POST /api/auth/login` (or register first with `POST /api/auth/register`).
2. The browser stores the `access_token` and `refresh_token` **httpOnly cookies** and sends them automatically on every following Swagger request.
3. `POST /api/auth/refresh` gets a new access token (it lasts 15 minutes); sessions expire after 30 minutes of inactivity.
4. `POST /api/auth/logout` ends the session.

### Scripts (run inside `backend/`)

| Command              | What it does                         |
| -------------------- | ------------------------------------ |
| `npm run start:dev`  | Start the API with hot reload        |
| `npm run build`      | Compile to `dist/`                   |
| `npm run lint`       | ESLint (auto-fix)                    |
| `npm run format`     | Prettier                             |
| `npm run seed:admin` | Seed the administrator (ACC-18)      |

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
│   ├── proj_description.md
│   ├── requirements/             # official PDF + requirement CSVs
│   └── api/
├── AI_PROMPTS.txt
├── .env.example
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

## Using auth in your module

```ts
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';

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
- One branch per task from the latest `develop`: `feature/<REQ-ID>-<description>`.
- Conventional commits with requirement IDs: `feat(auth): implement registration (ACC-01)`.
- Open a PR into `develop`; the team leader reviews and merges.
- Never commit `.env`, keys or the Mongo connection string.
- Log AI usage at the bottom of [`AI_PROMPTS.txt`](AI_PROMPTS.txt).
