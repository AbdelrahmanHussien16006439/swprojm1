Team Plan — Travel Planning and Booking Platform (Software Project I, Winter 2026)
⚠️ CURRENT PHASE: MILESTONE 1 ONLY (BACKEND) — deadline 20/11/2026
We are building only the NestJS backend + MongoDB + Swagger right now. Do NOT build any frontend / Next.js code yet. Every line marked "Milestone 2 frontend" is for later — ignore it for now.

How to use this file with an AI assistant

Give your AI this whole file and say:

"I am Member N in this project. We are doing Milestone 1 only (backend, NestJS + MongoDB + Swagger) — ignore all Milestone 2 / frontend parts. Read the whole file, especially Section 3 (Shared Conventions), Section 4 (Shared Services) and my section in Section 6. Help me build only my backend tasks for the current round, inside my own folders, following the conventions exactly. Do not create code for other members' modules."

Also give the AI the official project PDF and the official Excel requirements sheet when it needs exact business rules (limits, hold times, password rules, etc.). The Excel sheet is the authoritative source for business rules.

1. Project summary
   A full-stack travel platform: flight booking, hotel booking, itinerary planning and budgeting, and a blog/community, with role-based access.

Backend: NestJS (TypeScript) + MongoDB Atlas (Mongoose). REST API under /api. Documented with Swagger at /api/docs.
Frontend: Next.js (App Router, React, TypeScript).
Payments: Stripe test mode.
Exchange rates: FXRatesAPI, called only from the backend.
Architecture: MVC — Mongoose schemas = Model, NestJS controllers = Controller, Next.js = View, NestJS services hold business logic.
Roles: Guest (not logged in), Registered User, Administrator, Airline Moderator (exactly one airline), Hotel Moderator (exactly one hotel), System (cron jobs, webhooks).

Deadlines
Milestone Content Deadline
Milestone 1 Backend + API + Swagger (no frontend needed) 20/11/2026
Milestone 2 Next.js frontend + integration 11/12/2026 2. How we work: rounds (no waiting, no stubs)
The work is split into rounds. In each round you only build things that depend on nothing, or on code that is already merged into develop from a previous round.

Golden rule: If you need someone else's code, check whether it is already in develop. If not, work on another item in your list. Never copy someone's unfinished code.

Milestone 1 timeline
Round Dates What happens Ends with
Hour 0 15/11 (today) Member 1 creates the repo, NestJS skeleton, empty modules for everyone, installs all packages Everyone clones and runs the backend
Round 1 15/11 – 16/11 Everyone builds their independent parts. Endpoints are built without auth guards for now Everyone merges into develop by end of 16/11
Round 2 17/11 – 18/11 Build on Round 1 work. Add auth guards to all your endpoints Everyone merges into develop by end of 18/11
Round 3 19/11 Connect features, notifications, audit logs, Swagger docs, testing Member 1 merges develop → main on 19/11 night
Submit 20/11 Milestone 1 deadline
Milestone 2 (frontend) — overview
First 2 days: Member 1 builds the layout, navbar, login/register/profile pages, API client and route protection. Everyone else builds their pages directly against the finished backend.
Each member builds the frontend for the same feature they built in the backend (see Section 6).
Detailed Milestone 2 plan will be added to this file after Milestone 1. 3. Shared conventions (EVERYONE must follow these exactly)
3.1 Repository structure
project-root/
├── backend/ # NestJS app
│ └── src/
│ ├── main.ts # owned by Member 1
│ ├── app.module.ts # owned by Member 1 — DO NOT EDIT
│ ├── common/ # owned by Member 1 (guards, decorators, enums, filters, pagination)
│ └── modules/
│ └── <module>/ # each module owned by ONE member (see 3.2)
├── frontend/ # Next.js app (Milestone 2)
├── docs/
│ ├── TEAM_PLAN.md # this file
│ ├── requirements/ # official PDF + Excel sheet
│ └── api/
├── AI_PROMPTS.txt
├── README.md
├── .env.example
└── .gitignore
3.2 Module ownership — edit ONLY your own folders
Member 1 creates all these module folders (empty) in Hour 0 and registers them in app.module.ts. Nobody else edits app.module.ts.

Folder in backend/src/modules/ Owner
auth, users, admin-accounts, audit-logs, uploads (+ src/common/) Member 1
blog, reports, admin-moderation Member 2
reference-data, airlines, flights Member 3
flight-bookings, payments Member 4
hotels Member 5
hotel-bookings, reviews, notifications Member 6
itineraries Member 7
If you need a change in someone else's folder, ask the owner — do not edit it yourself.

Inside each module use this layout:

modules/flights/
├── flights.module.ts
├── flights.controller.ts
├── flights.service.ts
├── schemas/flight.schema.ts
└── dto/create-flight.dto.ts, update-flight.dto.ts, search-flights.dto.ts
3.3 Packages (already installed by Member 1 — do not add new ones without telling Member 1)
@nestjs/mongoose mongoose @nestjs/config @nestjs/jwt @nestjs/swagger @nestjs/schedule class-validator class-transformer cookie-parser bcrypt stripe multer (+ their @types/\*). If you really need a new package, tell Member 1 so package.json does not get merge conflicts.

3.4 Roles (file: backend/src/common/enums/role.enum.ts)
export enum Role {
USER = 'user',
ADMIN = 'admin',
AIRLINE_MODERATOR = 'airline_moderator',
HOTEL_MODERATOR = 'hotel_moderator',
}
3.5 Authentication (built by Member 1 in Round 1, used by everyone from Round 2)
JWT is stored in an httpOnly cookie named access_token. Never use localStorage/sessionStorage.
JWT payload:
{ sub: string /_ userId _/, email: string, role: Role, providerId?: string /_ airlineId or hotelId for moderators _/ }
Usage in any controller:
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { Role } from '../../common/enums/role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AIRLINE_MODERATOR)
@Post()
create(@Body() dto: CreateFlightDto, @CurrentUser() user: JwtUser) { ... }
Endpoints for guests (e.g. search) have no guards.
JwtAuthGuard also rejects suspended/deactivated accounts.
Ownership checks are your job inside your service, e.g. a moderator can only edit flights where flight.airlineId === user.providerId; a user can only see bookings where booking.userId === user.sub. Return 403 Forbidden otherwise (or 404 for private resources).
Round 1: build endpoints without guards. Round 2: add guards and ownership checks.
3.6 Database & Mongoose conventions
One shared MongoDB Atlas database; connection string in backend/.env as MONGODB_URI (never commit .env).
Schemas use @Schema({ timestamps: true }) → every document has createdAt, updatedAt.
References use Types.ObjectId with ref: '<ModelName>'.
Model names (use these exact names in ref):
Model name Owner Notes
User M1 email (unique), passwordHash, firstName, lastName, role, status (active/suspended/deactivated), providerId, preferences, failedLoginAttempts, lockUntil
AuditLog M1 actorId, action, targetType, targetId, details, createdAt
Country, City, Airport, Attraction M3 Seeded from official CSV files. Keep the official IDs/codes. Airport has IANA timezone
Airline M3 name, code, isActive, baggagePolicy, cancellationPolicy
Flight M3 airlineId, flightNumber, departureAirportId, arrivalAirportId, departureTime, arrivalTime (stored UTC), status, cabins: [{ _id, cabinClass, price, currency, totalSeats, availableSeats, baggageAllowance }]
FlightBooking M4 userId, flights, passengers (embedded), baggage, totalPrice, currency, status, bookingReference, holdExpiresAt, policyAcceptedAt, paymentId
Payment, Refund M4 bookingType (flight/hotel), bookingId, amount, currency, stripePaymentIntentId, status
Hotel M5 name, cityId, address, stars, amenities, isActive, checkInTime, checkOutTime, cancellationPolicy
Room M5 hotelId, name, type, maxOccupancy, pricePerNight, currency, blockedDates, isActive
HotelBooking M6 userId, hotelId, rooms: [roomId], checkIn, checkOut, guests, totalPrice, status, bookingReference, policyAcceptedAt, paymentId
Review M6 userId, hotelId, hotelBookingId, rating, comment, isHidden
Notification M6 userId, type, message, isRead, link
Itinerary M7 ownerId, title, countries, startDate, isPublic, clonedFrom, originalAuthorId, days (ordered), displayCurrency
Post, Comment, Like M2 Post: authorId, title, content, status (draft/published), tags, images, likesCount, isHidden. Like has a unique index on (postId, userId)
Report M2 reporterId, targetType (post/comment/review/itinerary), targetId, reason, status (pending/dismissed/hidden/deleted)
3.7 Booking status values (M4 and M6 use the same values)
pending (on hold, waiting for payment) → confirmed (paid) → cancelled / completed. Also expired (hold expired) and payment_failed.

3.8 API style
Global prefix /api (already set in main.ts). Use the endpoint paths from the official PDF (Section 8).
Validate every request body/query with a DTO + class-validator (global ValidationPipe with whitelist: true).
Add Swagger decorators to every controller: @ApiTags('flights'), and @ApiProperty() on DTO fields so Swagger shows the bodies.
Errors: throw Nest exceptions (BadRequestException, NotFoundException, ForbiddenException, ConflictException, UnauthorizedException). Do not return errors as 200.
Pagination: query ?page=1&limit=20, response:
{ "data": [ ... ], "page": 1, "limit": 20, "total": 134 }
Use the helper paginate() from src/common/utils/pagination.ts (Member 1).
Sorting: ?sortBy=price&order=asc.
Dates: store in UTC. Flight times are shown using the airport's IANA timezone.
Money: store as number with a currency field (ISO code from Countries.csv). 4. Shared services (how modules talk to each other)
These are real services built by their owner in Round 1 and used by others from Round 2. To use one, import the owner's module in your module's imports and inject the service in your constructor. The exact signatures:

Service Owner Signature Used by
AuditLogsService (exported by AuditLogsModule) M1 log(actorId: string, action: string, targetType: string, targetId: string, details?: any): Promise<void> M1, M2, M3, M5 (admin & moderator actions)
UploadsService (exported by UploadsModule) M1 validateAndSaveImage(file: Express.Multer.File): Promise<{ id: string; url: string }> and deleteImage(id: string): Promise<void> M2, M7
NotificationsService (exported by NotificationsModule) M6 notify(userId: string, type: string, message: string, link?: string): Promise<void> everyone
PaymentsService (exported by PaymentsModule) M4 createPayment(bookingType: 'flight' | 'hotel', bookingId: string, amount: number, currency: string, userId: string): Promise<{ paymentId: string; clientSecret: string }> and createRefund(paymentId: string, amount: number, reason: string): Promise<Refund> M4, M6
Payment result callbacks M4 & M6 When Stripe confirms/fails, PaymentsService calls FlightBookingsService.onPaymentSucceeded(bookingId) / onPaymentFailed(bookingId) and HotelBookingsService.onPaymentSucceeded(bookingId) / onPaymentFailed(bookingId) M4 builds the flight ones, M6 builds the hotel ones
FlightsService.search(dto) (exported by FlightsModule) M3 Same logic as GET /api/flights/search M7
HotelsService.search(dto) (exported by HotelsModule) M5 Same logic as GET /api/hotels/search M7
FlightsService.findById(id), HotelsService.findRoomsByIds(ids) M3, M5 Read helpers M4, M6
To avoid circular imports between payments and the booking modules, M4 uses NestJS forwardRef(() => ...) where needed.

5. Git & GitHub rules
   Branches: main (stable, milestone releases only) and develop (integration). Never commit directly to main or develop.
   Every task gets its own branch from the latest develop:
   git checkout develop
   git pull origin develop
   git checkout -b feature/FLT-03-create-flight

# ... work ...

git add .
git commit -m "feat(flights): create flight endpoint (FLT-03)"
git push -u origin feature/FLT-03-create-flight
Then open a Pull Request into develop on GitHub. Member 1 reviews and merges.
Branch names: feature/<REQ-ID>-<short-description>, fix/<REQ-ID>-<short-description>, docs/<description>.
Commit messages: Conventional Commits, include requirement IDs: feat(auth): implement registration (ACC-01). Never use "update", "fix", "final".
PR title and description must mention the requirement IDs.
Pull develop into your branch often (git pull origin develop) to avoid big conflicts.
Never commit .env, secrets, Stripe keys or the Mongo connection string.
AI log: every time an AI prompt materially helps you, add an entry to AI_PROMPTS.txt in your branch (format is at the top of that file).
First-time setup for every member
git clone <repo-url>
cd <repo-folder>
git checkout develop
cd backend
npm install

# create backend/.env by copying .env.example and filling the values Member 1 sends you privately

npm run start:dev

# open http://localhost:4000/api/docs

6. Tasks per member
   Requirement IDs refer to the official Excel sheet. Check the sheet for exact rules before implementing each one.

👤 MEMBER 1 — Team Leader: Core Platform, Auth & Accounts
Folders: src/common/, modules/auth, modules/users, modules/admin-accounts, modules/audit-logs, modules/uploads, main.ts, app.module.ts, seed scripts for admin.

Hour 0 (15/11)

Create GitHub repo, main + develop, add teammates, NestJS skeleton, install all packages, create all empty modules, main.ts (prefix, cookies, CORS, ValidationPipe, Swagger), MongoDB Atlas, share .env values privately, Role enum.
Round 1 (15–16/11)

User schema.
POST /api/auth/register (ACC-01) — unique email, password rules, bcrypt hash, role always user.
POST /api/auth/login (ACC-04, ACC-05) — failed-login lockout, sets httpOnly access_token cookie, session expiry, blocks suspended accounts.
POST /api/auth/logout (ACC-06), PATCH /api/auth/change-password (ACC-08), GET /api/auth/me (ACC-04, ACC-19).
GET/PATCH/DELETE /api/users/me (ACC-11, ACC-09, ACC-12 — delete = deactivate).
common/: JwtAuthGuard, RolesGuard, @Roles(), @CurrentUser(), JwtUser interface, global exception filter, paginate() helper.
AuditLogsService.log() + AuditLog schema.
UploadsService (image type/size validation — GEN-08).
Seed script that creates the administrator accounts.
Round 2 (17–18/11)

POST /api/admin/moderators (ACC-13) — creates an airline/hotel moderator assigned to exactly one provider (providerId).
GET /api/admin/accounts (ACC-14) with filters + pagination.
PATCH /api/admin/accounts/:id/suspend and /reactivate (ACC-15, ACC-16).
POST /api/admin/users/:id/reset-password (ACC-07a).
Audit-log calls for all admin actions. Add guards to own Round 1 endpoints.
Round 3 (19/11)

Review/merge all PRs, test all roles in Swagger, README setup instructions, .env.example, merge develop → main.
Milestone 2 frontend: app layout, navbar, API client (credentials: 'include'), login, register, profile, change password, route protection by role, admin "Accounts & Moderators" page.

👤 MEMBER 2 — Blog, Community & Moderation
Folders: modules/blog, modules/reports, modules/admin-moderation.

Round 1 (15–16/11) — build without guards

Post, Comment, Like schemas (unique index postId + userId on Like).
POST /api/posts (BLG-01), GET /api/posts (BLG-02, BLG-09 — search, tags, pagination, only published), GET /api/posts/:id (BLG-02), GET /api/posts/mine (BLG-03), PATCH /api/posts/:id & DELETE /api/posts/:id (BLG-04, BLG-08).
POST /api/posts/:id/comments (BLG-05), PATCH/DELETE /api/comments/:id (BLG-07).
POST/DELETE /api/posts/:id/like (BLG-06) — at most one like per user.
GET /api/tags/:tag/posts (BLG-08), GET /api/authors/:id (BLG-12).
Round 2 (17–18/11)

POST/DELETE /api/posts/:id/images (BLG-10, GEN-08) using M1's UploadsService.
Report schema + report endpoint(s) for posts/comments/reviews/itineraries (GEN-09).
GET /api/admin/reports, PATCH /api/admin/reports/:id (dismiss / hide) (GEN-09, GEN-10).
DELETE /api/admin/content/:type/:id (GEN-10).
GET /api/admin/audit-logs (GEN-07) — reads M1's AuditLog collection with filters + pagination.
PATCH /api/admin/providers/:type/:id/deactivate and /reactivate (ACC-15) — sets isActive on Airline/Hotel; notifies the affected moderator via NotificationsService.
Audit-log calls for every moderation action. Guards + ownership (authors edit only their own posts/comments).
Round 3 (19/11)

GET /api/admin/bookings (ACC-17) — reads FlightBooking and HotelBooking collections, filters + pagination.
Swagger docs, testing.
Milestone 2 frontend: blog list/search (Dynamic SSR), published post page & author page (ISR), editor/drafts (SSR + client components), likes and comments (client components), report button, admin reports/moderation page, audit-log page, admin bookings page.

👤 MEMBER 3 — Airlines, Flights & Reference Data
Folders: modules/reference-data, modules/airlines, modules/flights.

Round 1 (15–16/11) — do the seeding FIRST, others need it

Schemas + seed script for Country, City, Airport (with IANA timezone), Attraction from the official CSV datasets. Keep the official IDs/codes. Document how to run the seed in README.
GET /api/airports (FLT-02) (+ simple GET endpoints for countries/cities if useful to others).
Airline schema, POST/GET/PATCH /api/airlines(/:id) (FLT-01).
Flight schema with embedded cabins. POST /api/flights (FLT-03), GET /api/flights/:id (FLT-17), PATCH /api/flights/:id (FLT-05).
POST /api/flights/:id/cabins, PATCH /api/flights/:id/cabins/:cabinId (FLT-04, FLT-05).
PUT /api/airlines/:id/baggage-policy (FLT-04, FLT-08), PUT /api/airlines/:id/cancellation-policy (FLT-09).
Export FlightsService.findById().
Round 2 (17–18/11)

GET /api/flights/search (FLT-11, FLT-12, FLT-15) — one-way & round-trip, dates, passenger types/counts, cabin class, price filter, sorting, pagination, hides inactive airlines and cancelled flights, correct time zones. Export FlightsService.search().
POST /api/flights/:id/cancel (FLT-06) — notifies booked users via NotificationsService.
Guards + ownership: airline moderator manages only user.providerId airline. Audit-log calls.
Round 3 (19/11)

GET /api/flights/:id/bookings and GET /api/flights/:id/passengers/export (FLT-29) — reads M4's FlightBooking.
Swagger docs, testing.
Milestone 2 frontend: flight search & results page (Dynamic SSR) with filters/sorting, airline moderator dashboard (profile, flights, cabins, policies, bookings, passenger export).

👤 MEMBER 4 — Flight Booking & Payments (Stripe)
Folders: modules/flight-bookings, modules/payments.

Round 1 (15–16/11)

Stripe test-mode account; keys in .env (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) — send names to Member 1 for .env.example, never commit values.
Payment, Refund schemas and PaymentsModule exporting PaymentsService (see Section 4).
POST /api/payments (PAY-01) — creates Stripe PaymentIntent, returns clientSecret. Never store card data.
POST /api/payments/webhook (PAY-01) — verifies Stripe signature (needs raw body), marks payment succeeded/failed, calls the booking module's onPaymentSucceeded/onPaymentFailed.
POST /api/payments/:id/retry, GET /api/payments/:id (PAY-01), GET /api/refunds/:id (PAY-03).
GET /api/bookings/:type/:id/policies and POST /api/bookings/:type/:id/accept-policies (PAY-02) — stores acceptance with timestamp. Booking cannot be paid before policies are accepted.
FlightBooking schema.
Round 2 (17–18/11) — needs M3's Flight

POST /api/flight-bookings/hold (FLT-22) — concurrency-safe seat hold: atomic findOneAndUpdate on the cabin with availableSeats >= n and $inc: -n. Sets holdExpiresAt.
Cron job (@nestjs/schedule) that expires holds and releases seats.
POST /api/flight-bookings (FLT-19, FLT-21) — passengers, baggage, summary.
onPaymentSucceeded → status confirmed, unique bookingReference. onPaymentFailed / expiry → release seats.
GET /api/flight-bookings, GET /api/flight-bookings/:id (FLT-25) — only own bookings.
GET /api/flight-bookings/:id/e-ticket (FLT-23).
POST /api/flight-bookings/:id/cancel (FLT-26) — refund calculated from airline cancellation policy via createRefund.
Round 3 (19/11)

Notifications (NotificationsService.notify) on confirmation, failure, cancellation, refund.
Test: two simultaneous holds cannot oversell; failed payment releases seats. Swagger docs.
Milestone 2 frontend: passenger & baggage form, booking summary, policy acceptance, Stripe checkout component (reusable by M6), "My Flight Bookings" (Dynamic SSR) with cancel and e-ticket, payment/refund status.

👤 MEMBER 5 — Hotels, Rooms & Availability
Folders: modules/hotels.

Round 1 (15–16/11)

Hotel, Room schemas (availability/blocked dates design is yours — document it).
POST /api/hotels, PATCH /api/hotels/:id (HTL-01), GET /api/hotels/:id (HTL-02).
POST /api/hotels/:id/rooms (HTL-03), PATCH /api/hotels/:id/rooms/:roomId (HTL-05), DELETE /api/hotels/:id/rooms/:roomId (HTL-06).
POST/PATCH /api/hotels/:id/rooms/:roomId/availability (HTL-04, HTL-05, HTL-06) — availability, prices, blocked dates.
PUT /api/hotels/:id/policies (HTL-09, HTL-10) — check-in/out times, cancellation policy.
Export HotelsService.findRoomsByIds().
Round 2 (17–18/11)

GET /api/hotels/search (HTL-11, HTL-12) — destination (uses M3's City), dates, guests, filters, sorting, pagination, hides inactive hotels. Export HotelsService.search().
GET /api/hotels/:id/rooms/available (HTL-15) — must exclude rooms with overlapping confirmed/pending HotelBookings and blocked dates.
GET /api/hotels/:id/availability (HTL-08).
Guards + ownership: hotel moderator manages only user.providerId hotel. Audit-log calls.
Round 3 (19/11)

GET /api/hotels/:id/reservations (HTL-22) — reads M6's HotelBooking.
Swagger docs, testing.
Milestone 2 frontend: hotel search & results (Dynamic SSR), hotel detail page with rooms, hotel moderator dashboard (profile, rooms, availability calendar, policies, reservations).

👤 MEMBER 6 — Hotel Booking, Reviews & Notifications
Folders: modules/hotel-bookings, modules/reviews, modules/notifications.

Round 1 (15–16/11) — do notifications FIRST, everyone uses it

Notification schema, NotificationsModule exporting NotificationsService.notify() (Section 4).
GET /api/notifications (own, paginated), PATCH /api/notifications/:id/read, PATCH /api/notifications/read-all.
HotelBooking and Review schemas.
Round 2 (17–18/11) — needs M5's Room and M4's PaymentsService

POST /api/hotel-bookings (HTL-16, HTL-18) — one or more rooms in the same hotel, booked in one MongoDB transaction; reject if any room overlaps an existing pending/confirmed booking or blocked dates (concurrency-safe).
onPaymentSucceeded → confirmed + bookingReference; onPaymentFailed / expiry → release.
GET /api/hotel-bookings, GET /api/hotel-bookings/:id (HTL-20) — only own.
POST /api/hotel-bookings/:id/cancel (HTL-21) — refund from hotel cancellation policy via PaymentsService.createRefund.
Round 3 (19/11)

POST /api/hotel-bookings/:id/review (HTL-23) — only after a completed stay, per eligibility rules. PATCH/DELETE /api/reviews/:id (HTL-23), GET /api/hotels/:id/reviews (HTL-24).
Notifications on hotel booking confirmation/cancellation. Swagger docs, testing.
Milestone 2 frontend: room selection & hotel booking summary, checkout (reuse M4's Stripe component), "My Hotel Bookings" (Dynamic SSR), review form & list, notification bell/dropdown in the navbar for the whole app.

👤 MEMBER 7 — Itineraries & Budgeting
Folders: modules/itineraries.

Round 1 (15–16/11)

Itinerary schema (days ordered; activities, budget entries, transport costs — embedded or separate collections, your choice, but /api/activities/:id, /api/budgets/:id, /api/transport-costs/:id must work).
POST/GET/PATCH/DELETE /api/itineraries(/:id) (ITN-01, ITN-03).
Days: POST /api/itineraries/:id/days (ITN-05), PATCH .../days/:dayId (ITN-05), DELETE .../days/:dayId (ITN-07), PATCH .../days/reorder (ITN-08). Day numbers and dates are derived from startDate + order and must update after add/delete/reorder. Note: define the reorder route before :dayId routes so Nest doesn't treat "reorder" as an id.
Activities: POST .../days/:dayId/activities, PATCH/DELETE /api/activities/:id (ITN-10).
Budgets: POST .../days/:dayId/budgets, PATCH/DELETE /api/budgets/:id (ITN-14) — categories: food, accommodation, local transportation, activities.
Transport costs: POST /api/itineraries/:id/transport-costs, PATCH/DELETE /api/transport-costs/:id (ITN-16).
FXRatesAPI service (key in .env as FXRATES_API_KEY, never sent to frontend); handle invalid currency codes, unavailable rates, API failures (cache rates).
GET /api/itineraries/:id/budget-summary (ITN-14, ITN-18) — totals converted to the selected display currency.
Round 2 (17–18/11)

Public/private (ITN-20): private only visible to owner.
GET /api/itineraries/public/search, GET /api/itineraries/public/:id (ITN-20, ITN-21).
POST /api/itineraries/:id/clone (ITN-21) — independent private copy, keeps attribution (clonedFrom, originalAuthorId).
POST/DELETE /api/activities/:id/images(/:imageId) (ITN-12, GEN-08) using M1's UploadsService.
Guards + ownership checks on every private endpoint.
Round 3 (19/11)

GET /api/itineraries/:id/hotels (ITN-25) and GET /api/itineraries/:id/flights (ITN-26) — reuse M5's HotelsService.search() and M3's FlightsService.search() with the itinerary's cities/dates.
Swagger docs, testing.
Milestone 2 frontend: "My Itineraries" & private detail (Dynamic SSR), itinerary editor (SSR + client components, drag-and-drop day reorder), budget panel with currency selector, public itinerary search (Dynamic SSR) & public detail (ISR), clone button.

7. Optional bonuses (ONLY after all mandatory work is done)
   Each bonus goes to the owner of that feature:

Bonus Owner
Email verification, forgot/reset password by email (ACC-02, ACC-07) M1
Attach itinerary to blog post (BLG-13) M2
Flight change, seat selection (FLT-27, FLT-28) M4
Hotel moderator review replies (HTL-26) M6
Email notifications M6
Attach bookings to itinerary, PDF export (ITN-27, ITN-28) M7
Cloud deployment M1 8. Definition of done (for every endpoint)
Works in Swagger UI (/api/docs) with example request bodies.
Request validated by a DTO; wrong input returns 400 with a clear message.
Correct guards/roles; ownership checked in the service.
Pagination/filtering/sorting where it is a list.
Requirement ID in commit message and PR.
AI prompts logged in AI_PROMPTS.txt.
You can explain the code yourself in the evaluation.
