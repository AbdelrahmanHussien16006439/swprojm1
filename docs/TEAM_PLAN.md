Team Plan — Travel Planning and Booking Platform (Software Project I, Winter 2026)
⚠️ CURRENT PHASE: MILESTONE 1 ONLY (BACKEND) — deadline 20/11/2026
We are building only the NestJS backend + MongoDB Atlas + Swagger right now. Do NOT build any frontend / Next.js code yet. Lines marked "Milestone 2 frontend (later)" are for later — ignore them.

Sources this plan is based on (all in docs/requirements/):

project-description.pdf — official project description (tech stack, endpoints, Git rules).
requirements-mandatory.csv — official mandatory requirements (authoritative rules).
requirements-bonus.csv — official optional bonus requirements.
Every rule in Section 7 is copied from the requirement sheet. If something here ever disagrees with the sheet, the sheet wins.

0. READ THIS FIRST — instructions for the AI assistant
   Team member: paste this whole file into your AI chat (and, if possible, attach requirements-mandatory.csv), then write:

"I am Member N. We are doing Milestone 1 only (backend: NestJS + MongoDB + Swagger). Read this whole file. Help me implement my task list in Section 7, in order, starting from task 1. For each task: write the schema/DTO/service/controller code, tell me exactly which files to create, and how to test it in Swagger. Follow Sections 3–6 exactly."

Rules the AI must follow:

Only write code inside the member's own folders (Section 3.2). Never modify another member's module, app.module.ts, main.ts or src/common/ (unless helping Member 1).
Use the exact names in this file: model names (3.7), roles (3.5), status values (3.8), service signatures (Section 4), endpoint paths (Section 7). Other members' AIs use the same names, so the code fits together.
Implement the business rules exactly as written in Section 7 (they come from the official sheet): limits, hold times, age bands, refund tiers, character limits, etc. Put numeric rule values in a constants file in the module (e.g. flight-bookings.constants.ts) with the requirement ID in a comment. If a rule is unclear, say so and check Section 10 (Open questions) — do not silently invent behaviour.
Every endpoint must have: a DTO validated with class-validator (field-level error messages — GEN-02), Swagger decorators (@ApiTags, @ApiOperation, @ApiProperty({ example }) on DTO fields, @ApiQuery for query params), correct HTTP status codes, and Nest exceptions for errors.
All validation, business rules and authorisation are enforced in the backend (GEN-13): role checks with guards and ownership checks in the service for every private resource (ACC-11).
Every list is paginated with page size 10 (GEN-05) using the shared paginate() helper.
If a task is marked ⏳ (needs another member's code), first check that code exists in the project (git pull origin develop). If it doesn't exist yet, tell the member to skip to the next task. Never create a fake copy of another member's schema or service.
Keep code simple and readable — the student must explain it in the evaluation.
At the end of each task, remind the member to: commit with the requirement ID, open a PR into develop, and add an entry to AI_PROMPTS.txt.

1. Project summary
   A web platform that combines flight booking, hotel booking, itinerary planning & budgeting, and a travel blog/community.

Backend: NestJS (TypeScript) + MongoDB Atlas (Mongoose). REST API under /api. Swagger UI at /api/docs. Milestone 1 is evaluated through Swagger UI.
Frontend: Next.js (Milestone 2 — not now).
Payments: Stripe test mode (PaymentIntents). Card details never reach our backend.
Exchange rates: FXRatesAPI (https://fxratesapi.com/), called only from the backend, fetched once per day and cached in the DB.
Architecture: MVC — Mongoose schemas = Model, NestJS controllers = Controller, Next.js = View; business logic in NestJS services. One backend, one frontend, one shared MongoDB Atlas database.
Reference data (countries, cities, airports, currencies, attractions) is seeded from the official datasets: https://docs.google.com/spreadsheets/d/17WYE0p9EHUn-GUDrtqtCAekhqecOX8H1/edit?gid=874030513 — the evaluation uses the same records and identifiers.
Actors
Actor Role value Summary
Guest — (no login) Search flights & hotels, view details, browse published posts and public itineraries. Restricted actions require login
Registered User user Profile, flight & hotel bookings, payments, cancellations, itineraries & budgets, publish/clone itineraries, posts, comments, likes, hotel reviews, reports
Administrator admin Seeded only (ACC-18). Creates moderators, suspends/reactivates accounts, deactivates providers, views bookings, handles reports, moderates content, audit log
Airline Moderator airline_moderator Manages exactly one airline: profile, flights, cabins, baggage, cancellation tiers, bookings
Hotel Moderator hotel_moderator Manages exactly one hotel: profile, rooms, availability, blocked dates, policies, reservations
System — Stripe webhook, hold expiry, status updates (cron), notifications, exchange rates, audit logging
Deadlines
Milestone Content Deadline
Milestone 1 Backend + REST API + Swagger + MongoDB Atlas + README + AI_PROMPTS.txt + Git history 20/11/2026
Milestone 2 Next.js frontend + integration 11/12/2026 2. How we work: one ordered list per member
Member 1 creates the repo and backend skeleton first (about 1–2 hours). Everyone clones it and starts task 1.
Do your tasks in order (Section 7). Tasks other members need are at the top. Tasks needing other members' code are lower and marked ⏳ needs ….
Merge each finished task immediately (PR into develop). Don't wait until your whole list is done — that's how teammates get your code.
When you reach a ⏳ task: git pull origin develop. If the code is there, do it. If not, do your next task and come back later. Never wait, never copy unfinished code.
Login guards: until Member 1's guards are merged, build endpoints without @UseGuards; adding them is a ⏳ task in everyone's list.
Everything merged into develop by 19/11. Member 1 merges develop → main that night. Submission 20/11. 3. Shared conventions (EVERYONE must follow these exactly)
3.1 Repository structure
project-root/
├── backend/
│ ├── src/
│ │ ├── main.ts # Member 1
│ │ ├── app.module.ts # Member 1 — nobody else edits it
│ │ ├── common/ # Member 1: guards, decorators, enums, filters, utils
│ │ └── modules/<module>/ # one owner per module (3.2)
│ ├── uploads/ # uploaded images (git-ignored), served at /uploads
│ └── .env # never committed
├── frontend/ # Milestone 2
├── docs/
│ ├── TEAM_PLAN.md # this file
│ ├── requirements/ # PDF + requirements CSVs
│ └── api/
├── AI_PROMPTS.txt
├── README.md
├── .env.example
└── .gitignore
3.2 Module ownership — edit ONLY your own folders
All modules already exist (empty) and are registered in app.module.ts.

Folder in backend/src/modules/ Owner
auth, users, admin-accounts, audit-logs (+ src/common/, main.ts, app.module.ts, admin seed) Member 1
blog, reports, admin-moderation, uploads, exchange-rates Member 2
airlines, flights Member 3
flight-bookings, payments Member 4
reference-data, hotels Member 5
hotel-bookings, reviews, notifications, admin-bookings Member 6
itineraries Member 7
Need a change in someone else's folder? Ask the owner.

Module layout:

modules/flights/
├── flights.module.ts
├── flights.controller.ts
├── flights.service.ts
├── flights.constants.ts # rule values from the sheet, with requirement IDs
├── schemas/flight.schema.ts
└── dto/create-flight.dto.ts, update-flight.dto.ts, search-flights.dto.ts
Every module exports its services AND its Mongoose models so others can read them:

@Module({
imports: [MongooseModule.forFeature([{ name: Flight.name, schema: FlightSchema }])],
providers: [FlightsService],
controllers: [FlightsController],
exports: [FlightsService, MongooseModule],
})
export class FlightsModule {}
Other members may read your model directly (@InjectModel('Flight')), but they change your data only through your service methods listed in Section 4 — except admin moderation (isHidden, M2) and deletion, which are documented there.

3.3 Requirement ID → owner (all mandatory requirements)
Requirement IDs Owner
ACC-01, 04, 05, 06, 07a, 08, 09, 11 (guards), 12, 13, 14, 15 (moderator accounts), 16, 18, 19, GEN-13 M1
BLG-01 … 10, BLG-12, GEN-07 (viewer + deletion logs), GEN-08 (uploads), GEN-09, GEN-10, ACC-15 (providers), ITN-18 (exchange-rate service) M2
FLT-01, 03, 04, 05, 06 (flight side), 08, 09, 11, 12 (search: round-trip + cabin filter), 15, 17, 30, GEN-06 M3
FLT-12 (booking: passenger types, round-trip booking), 19, 21, 22, 23, 25, 26, 29, FLT-06 (bookings side), PAY-01, 02, 03, 04, GEN-11 (flights) M4
GEN-12 (seed), FLT-02, HTL-01, 02, 03, 04, 05, 06, 08, 09, 10, 11, 12, 15 M5
GEN-01 (notifications), HTL-16, 17, 18, 20, 21, 22, 23, 24, GEN-11 (hotels), ACC-17 M6
ITN-01, 03, 05, 07, 08, 09, 10, 12, 14, 16, 18 (conversion in budget), 20, 21, 25, 26 M7
GEN-02 (field-level validation), GEN-05 (page size 10), ACC-11 (ownership) — in their own endpoints Everyone
ACC-10, GEN-03, GEN-04, GEN-14, GEN-15, GEN-16, GEN-17 — frontend only Everyone in Milestone 2
3.4 Packages (installed by Member 1 — don't add new ones without telling Member 1)
@nestjs/mongoose mongoose @nestjs/config @nestjs/jwt @nestjs/swagger @nestjs/schedule class-validator class-transformer cookie-parser bcrypt stripe multer luxon csv-parse pdfkit dev: @types/cookie-parser @types/bcrypt @types/multer @types/luxon @types/pdfkit

3.5 Roles — backend/src/common/enums/role.enum.ts
export enum Role {
USER = 'user',
ADMIN = 'admin',
AIRLINE_MODERATOR = 'airline_moderator',
HOTEL_MODERATOR = 'hotel_moderator',
}
3.6 Authentication (Member 1 builds it; everyone uses it)
Two httpOnly cookies (ACC-19): access_token (short-lived JWT, e.g. 15 min) and refresh_token (opaque random token). Both httpOnly: true, secure: true, sameSite: 'lax'. Never localStorage/sessionStorage/JS-readable storage. (Browsers accept secure cookies on http://localhost.)
Server-side sessions (Session model): refresh token stored hashed; lastActivityAt; revokedAt. Logout revokes the session (ACC-06). A session with no authenticated request for 30 minutes expires (ACC-06) — the guard checks lastActivityAt and updates it.
POST /api/auth/refresh rotates the refresh token and issues a new access token (only if the session is not revoked/idle-expired).
JWT payload — backend/src/common/interfaces/jwt-user.interface.ts:
export interface JwtUser {
sub: string; // user id
sid: string; // session id
email: string;
role: Role;
providerId?: string; // airlineId (airline_moderator) or hotelId (hotel_moderator)
}
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
create(@Body() dto: CreateFlightDto, @CurrentUser() user: JwtUser) {
return this.flightsService.create(dto, user);
}
JwtAuthGuard only → any logged-in user. @Roles(...) → only those roles. No guard → public.
OptionalJwtAuthGuard → public endpoint that behaves differently if logged in (e.g. authors/admins can see hidden content).
JwtAuthGuard rejects: missing/invalid token, revoked or idle-expired session, suspended/deactivated users, and users with mustChangePassword = true (except on endpoints marked @AllowPasswordChangeRequired(): change-password, me, logout).
Ownership checks are in the service (ACC-11):
if (flight.airlineId.toString() !== user.providerId) throw new ForbiddenException();
if (booking.userId.toString() !== user.sub) throw new NotFoundException(); // hide private resources
Testing in Swagger: call POST /api/auth/login in Swagger; the browser stores the cookies and sends them automatically on the next Swagger requests.
3.7 Database & model names (use EXACTLY these names in ref)
@Schema({ timestamps: true }) on every schema.
References: @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Flight' }) with import { Schema as MongooseSchema, Types } from 'mongoose' (the TypeScript field type stays Types.ObjectId). Never write @Prop({ type: Types.ObjectId }): it silently becomes Mixed, Mongoose stops casting string ids, and id filters match nothing.
Arrays of references: @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Flight' }] }).
Guard every reference field with a schema test: expect(XSchema.path('field').instance).toBe('ObjectId').
Validate id params with ParseObjectIdPipe (from common/) → 400 for invalid ids, 404 when not found.
Money (PAY-04): all flight and hotel prices, payments and refunds use one platform currency = PLATFORM_CURRENCY from .env (e.g. USD). Flight/hotel prices have no currency field. Only itinerary budgets use other currencies.
Dates: stored in UTC. Hotel and itinerary dates are calendar dates stored as Date at UTC midnight (API format YYYY-MM-DD).
Model Owner Main fields
User M1 name, email (unique, lowercase), passwordHash (bcrypt, salted), phone, preferredCurrency, role, status (active/suspended/deactivated), providerType (airline/hotel), providerId, termsAcceptedAt, mustChangePassword, failedLoginAttempts, lockUntil
Session M1 userId, refreshTokenHash, lastActivityAt, revokedAt, userAgent
AuditLog M1 actorId, action (e.g. USER_SUSPENDED), targetType, targetId, details
Country, City, Airport, Currency, Attraction M5 Seeded from official datasets, official IDs/codes kept. Airport: iataCode, name, cityId, countryId, timezone (IANA). Currency: codes listed in Countries.csv
Airline M3 name, code, logoUrl (max 1), isActive, baggagePolicy: { extraBagPrice (>0), maxExtraBagsPerPassenger (>=0) }, cancellationTiers: [{ daysBefore (int >=0, unique), refundPercent (0–100) }]
Flight M3 airlineId, flightNumber, departureAirportId, arrivalAirportId, departureTime, arrivalTime (UTC), status (scheduled/cancelled/departed), cabins: [{ _id, cabinClass ('economy'/'premium_economy'/'business'/'first'), price, totalSeats, availableSeats, heldSeats, bookedSeats, freeBags, maxBagWeightKg }]
FlightBooking M4 userId, airlineId, tripType (one_way/round_trip), segments: [{ flightId, cabinId, cabinClass, fare }], passengers: [{ type ('adult'/'child'/'infant'), fullName, dateOfBirth, documentNumber, extraBags, extraBagsWeightKg }], seatsHeld (adults + children), baggageFee, totalPrice, status, bookingReference (unique), holdExpiresAt, policyAcceptance: { acceptedAt, policySnapshot }, paymentId, refundId, cancelledBy (user/provider)
Payment M4 userId, bookingType (flight/hotel), bookingId, stripePaymentIntentId, amount, currency, status (pending/succeeded/failed/cancelled) — nothing else about the card (PAY-01)
Refund M4 paymentId, bookingType, bookingId, amount, refundPercent, reason, stripeRefundId, status (pending/refunded/failed)
Hotel M5 name, address, cityId, countryId, description, photos (max 5), stars, amenities, isActive, checkInTime, checkOutTime (HH:mm), cancellationTiers: [{ daysBefore, refundPercent }], averageRating, ratingsCount
Room M5 hotelId, name (unique within hotel), type, beds, maxOccupancy (>=1), pricePerNight (>0), availabilityRanges: [{ _id, startDate, endDate }] (non-overlapping), blockedRanges: [{ _id, startDate, endDate }], isActive, everReserved
HotelBooking M6 userId, hotelId, rooms: [{ roomId, roomName, pricePerNight, adults, children: [ages] }], checkIn, checkOut, nights, totalPrice, status, bookingReference, holdExpiresAt, policyAcceptance, paymentId, refundId
RoomNight M6 roomId, hotelId, date, hotelBookingId, bookingReference, holdExpiresAt (null once confirmed) — unique index { roomId, date } (see 6.2)
Review M6 userId, hotelId, hotelBookingId (unique), rating (1–5), text (optional, max 1000), isHidden
Notification M6 userId, type, message, link, isRead
Itinerary M7 ownerId, title (max 100), countryIds (>=1), startDate, isPublic (default false), isHidden, clonedFromId, originalAuthorId, days: [{ \_id, cityId, notes, activities: [{ _id, name, description, time?, cost?, currency?, images }], budgetEntries: [{ _id, category, amount (>=0), currency, note }] }] (max 60), transportCosts: [{ _id, mode, fromCityId, toCityId, amount, currency, dayId }]
Post M2 authorId, title, body, status (draft/published), tags (max 5, each max 30 chars, lowercase), images (max 5), likesCount, commentsCount, publishedAt, isHidden
Comment M2 postId, authorId, text (1–500), isHidden
Like M2 postId, userId — unique index { postId, userId }
Report M2 reporterId, targetType (post/comment/review/itinerary), targetId, reason, status (open/dismissed/hidden/deleted), resolvedBy, resolvedAt — unique index { reporterId, targetType, targetId } (GEN-09)
ExchangeRate M2 date, base, rates (map currency → rate), fetchedAt
3.8 Booking lifecycle (GEN-11) — M4 and M6 use exactly these values
pending_payment ──payment verified──▶ confirmed ──flight over / check-out passed──▶ completed
│ └──user or provider cancels──▶ cancelled
└──10-minute hold passed──▶ expired (inventory released, PaymentIntent cancelled)
These are the only transitions. A failed payment does not change the booking: it stays pending_payment and the user can retry until the hold expires (PAY-01).

3.9 Hidden content & deactivated users (GEN-10, ACC-12) — affects M2, M6, M7
Post, Comment, Review, Itinerary have isHidden. Hidden content is visible only to its author and admins. Public queries must exclude it.
Posts and public itineraries of deactivated users are hidden from everyone else. Their comments and reviews are still shown, but the author name is replaced by "Deleted user".
Content of suspended users stays visible (ACC-16).
3.10 API style
Prefix /api (set in main.ts). Use the endpoint paths in Section 7 exactly.
Validation (GEN-02, GEN-13): DTO + class-validator for every body and query (global ValidationPipe: whitelist, forbidNonWhitelisted, transform). Use PartialType from @nestjs/swagger for update DTOs.
Errors: throw Nest exceptions. The global filter (M1) returns:
{ "statusCode": 400, "error": "Bad Request", "message": ["password must contain at least one digit"], "path": "/api/auth/register", "timestamp": "..." }
400 invalid input/business rule · 401 not logged in · 403 wrong role/not owner/suspended · 404 not found (also for private resources of others) · 409 conflict (duplicate, no seats, room taken).
Pagination (GEN-05): every list ?page=1 (page size 10 fixed) → { "data": [...], "page": 1, "limit": 10, "total": 134, "totalPages": 14 } using paginate() from src/common/utils/pagination.ts.
Sorting: ?sortBy=price&order=asc. Filtering: query params (e.g. ?minPrice=100&maxPrice=500).
Flight times (GEN-06): entered and shown in each airport's local time zone, stored in UTC. Use luxon: DateTime.fromISO(local, { zone: airport.timezone }).toUTC(); responses include both UTC and local ISO strings.
Swagger: @ApiTags('<module>') on every controller; @ApiProperty({ example }) on every DTO field. 4. Shared services (exact signatures)
To use a service: import the owner's module in your module's imports, then inject the service. The owner lists it in exports.

Service (module) Owner Signature(s) Used by
AuditLogsService (AuditLogsModule) M1 log(actorId: string, action: string, targetType: string, targetId: string, details?: Record<string, any>): Promise<void> M1, M2
UsersService (UsersModule) M1 findById(id) · findPublicProfile(id) → { id, name, joinedAt, status } M2, M6, M7
UploadsService (UploadsModule) M2 saveImage(file: Express.Multer.File): Promise<{ id: string; url: string }> (JPG/PNG only, ≤ 5 MB, else 400) · deleteImage(id: string): Promise<void>. The count limits (5 per post/activity/hotel, 1 logo per airline) are checked by the module that owns the entity M2, M3, M5, M7
ExchangeRatesService (ExchangeRatesModule) M2 convert(amount: number, from: string, to: string): Promise<{ amount: number; rate: number; rateDate: Date }> · getLatest(): Promise<ExchangeRate> M7
NotificationsService (NotificationsModule) M6 notify(userId: string, type: string, message: string, link?: string): Promise<void> · notifyMany(userIds: string[], type: string, message: string, link?: string): Promise<void> M1, M2, M3, M4, M6
PaymentsService (PaymentsModule) M4 createPayment(bookingType: 'flight' | 'hotel', bookingId: string, amount: number, userId: string) → { paymentId, clientSecret } · cancelPayment(paymentId: string) (cancels the Stripe PaymentIntent when a hold expires) · createRefund(paymentId: string, amount: number, refundPercent: number, reason: string): Promise<Refund> (Stripe Refunds API, PAY-03) · calculateRefundPercent(tiers: { daysBefore: number; refundPercent: number }[], daysRemaining: number): number (FLT-09 rule, reused for HTL-10) M4, M6
Booking callbacks M4 / M6 Each booking service implements: getPolicies(bookingId, userId) · acceptPolicies(bookingId, userId) · getAmountForPayment(bookingId, userId) · onPaymentSucceeded(bookingId). PaymentsService calls them by bookingType M4 (FlightBookingsService), M6 (HotelBookingsService)
FlightBookingsService (FlightBookingsModule) M4 cancelAllForFlight(flightId: string): Promise<void> (FLT-06: confirmed → cancelled with 100% refund, release holds, notify) · findConfirmedUserIdsForFlight(flightId): Promise<string[]> (FLT-05 notifications) · hasBookings(flightId): Promise<boolean> · hasUpcomingConfirmed(userId): Promise<boolean> M3, M1
HotelBookingsService (HotelBookingsModule) M6 hasUpcomingConfirmed(userId): Promise<boolean> · findRoomNights(roomIds: string[], from: Date, to: Date) (active = confirmed or unexpired hold) · hasActiveReservationOverlap(roomId, from, to): Promise<boolean> M1, M5
AirlinesService (AirlinesModule) M3 findById(id) · setActive(id, isActive) · getModeratorPolicies(airlineId) M1, M2, M4
FlightsService (FlightsModule) M3 findById(id) · search(dto: SearchFlightsDto) (same logic as GET /api/flights/search; also accepts toAirportIds: string[] for ITN-26) M4, M7
HotelsService (HotelsModule) M5 findById(id) · findRoomsByIds(ids) · search(dto: SearchHotelsDto) (same logic as GET /api/hotels/search) · getFreeRooms(hotelId, checkIn, checkOut) · setActive(id, isActive) · updateRating(hotelId, averageRating, ratingsCount) · markRoomsReserved(roomIds) M1, M2, M6, M7
ReferenceDataService (ReferenceDataModule) M5 findCountry(id) · findCity(id) · findAirport(id) · findAirportsByCity(cityId) · isSupportedCurrency(code): Promise<boolean> · listCurrencies() M1, M2, M3, M7
PaymentsModule ↔ FlightBookingsModule / HotelBookingsModule import each other → use forwardRef(() => ...) on both sides (M4 and M6). Same for FlightsModule ↔ FlightBookingsModule (M3 and M4) and HotelsModule ↔ HotelBookingsModule (M5 and M6).

5. Dependencies (who needs whom)
   There are no circular dependencies in the work: every chain ends in code that depends on nothing. (Two modules may import each other with forwardRef, but each member's first tasks are independent.)

Member Independent (start immediately) ⏳ Needs another member's code Others waiting on this member
M1 Skeleton, ACC-01, 04, 05, 06, 07a, 08, 09, 14, 16 (status change), 18, 19, guards, GEN-13 ACC-12 ← M4 + M6 hasUpcomingConfirmed · ACC-13 ← M3 Airline + M5 Hotel · ACC-09 currency ← M5 Currency · suspension notifications ← M6 Everyone (skeleton, guards), M2 (AuditLog)
M2 GEN-08 uploads, exchange-rate service, BLG-01–09, GEN-09 BLG-10 ← own uploads · ITN-18 currencies ← M5 · GEN-07 ← M1 AuditLog · GEN-10 reviews ← M6, itineraries ← M7 · BLG-12 ← M7 · ACC-15 providers ← M3, M5, M6 M3, M5, M7 (uploads), M7 (exchange rates)
M3 FLT-01 (profile), 04, 08, 09, 30 FLT-03, 11, 12, 15, 17 ← M5 Airport · logo ← M2 uploads · FLT-05 notifications ← M4 + M6 · FLT-06 ← M4 cancelAllForFlight M4 (Flight), M7 (search), M1, M2 (Airline)
M4 PAY-01, 02, 03, 04 (payments module) FLT-12, 19, 21, 22, 23, 25, 26, 29 ← M3 Flight · notifications ← M6 M6 (PaymentsService), M3 (cancelAllForFlight), M1, M6 (FlightBooking)
M5 GEN-12 seed (first!), FLT-02, HTL-01, 03, 04, 09, 10 photos ← M2 uploads · HTL-02 reviews, HTL-05/06/08/11/12/15 ← M6 RoomNight M3, M7, M1, M2 (reference data), M6 (Room), M7 (hotel search)
M6 GEN-01 notifications (first!), schemas HTL-16/18 ← M5 Room + M4 PaymentsService · HTL-21 ← M4 refunds · ACC-17 ← M4 FlightBooking Everyone (notifications), M5 (RoomNight), M1
M7 ITN-01, 03, 05, 07, 08, 09, 10, 14, 16, 20, 21 country/city validation ← M5 · ITN-12 ← M2 uploads · ITN-18 ← M2 exchange rates · ITN-25 ← M5 search · ITN-26 ← M3 search M2 (BLG-12, GEN-10)
Merge these first (others are waiting): M1 skeleton + guards · M5 reference-data seed + Hotel/Room · M6 NotificationsService + RoomNight · M2 UploadsService · M3 Flight/Airline · M4 PaymentsService.

6. How to implement the tricky parts
   6.1 Flight seat hold (FLT-22) — M4
   Available seats = total − booked − held. Keep the three counters on the cabin (availableSeats, heldSeats, bookedSeats) and change them only with single atomic updates:

// hold n seats (n = adults + children; infants take no seat — FLT-12)
const updated = await this.flightModel.findOneAndUpdate(
{ \_id: flightId, status: 'scheduled', cabins: { $elemMatch: { _id: cabinId, availableSeats: { $gte: n } } } },
  { $inc: { 'cabins.$.availableSeats': -n, 'cabins.$.heldSeats': n } },
{ new: true },
);
if (!updated) throw new ConflictException('Not enough seats available');
Round-trip: hold both segments; if the second fails, undo the first.
Payment verified → heldSeats -n, bookedSeats +n. Hold expired → heldSeats -n, availableSeats +n. Confirmed booking cancelled → bookedSeats -n, availableSeats +n.
Booking pending_payment with holdExpiresAt = now + 10 min. A cron (@Cron(CronExpression.EVERY_MINUTE)) sets expired holds to expired, releases seats and calls PaymentsService.cancelPayment().
M3's seat-count edit (FLT-05) must keep totalSeats >= bookedSeats + heldSeats and set availableSeats = totalSeats - bookedSeats - heldSeats in one conditional update.
6.2 Hotel hold without double booking (HTL-18) — M6
Use RoomNight (one document per room per night) with a unique index on { roomId, date }, inserted inside one transaction together with the HotelBooking:

const session = await this.connection.startSession();
try {
await session.withTransaction(async () => {
// 1. validate: rooms in the same hotel, active, inside an availability range, no blocked range, occupancy (HotelsService)
// 2. delete RoomNight docs of EXPIRED holds for these rooms/nights (holdExpiresAt < now)
// 3. create HotelBooking (status 'pending_payment', holdExpiresAt = now + 10 min)
// 4. insert one RoomNight per room per night (date = checkIn ... checkOut - 1)
await this.roomNightModel.insertMany(nights, { session });
});
} catch (e) {
if (e.code === 11000) throw new ConflictException('One or more rooms are no longer available');
throw e;
} finally { await session.endSession(); }
If any room-night is taken, the whole request is rejected and nothing is held. On confirmation set RoomNight.holdExpiresAt = null. On expiry or cancellation delete the booking's RoomNights. M5: a room is free for a stay if it is active, every night is inside one of its availabilityRanges, no night is in a blockedRange, and no active RoomNight exists (active = holdExpiresAt is null or in the future).

6.3 Payment flow (PAY-01, PAY-02) — M4 (M6 plugs in for hotels)
Booking created → pending_payment with a 10-minute hold (6.1 / 6.2).
GET /api/bookings/:type/:id/policies → airline: cancellation tiers + baggage policy; hotel: cancellation tiers + check-in/out times.
POST /api/bookings/:type/:id/accept-policies { "accepted": true } → stores { acceptedAt, policySnapshot }. Refunds later use this snapshot.
POST /api/payments { bookingType, bookingId } → checks owner, pending_payment, hold not expired, policies accepted (else 400); amount comes from the booking (never from the client); creates a Stripe PaymentIntent in PLATFORM_CURRENCY; stores Payment (Stripe id, amount, currency, status only); returns { paymentId, clientSecret }.
The booking is confirmed only by the webhook POST /api/payments/webhook: verify with stripe.webhooks.constructEvent(req.rawBody, signature, STRIPE_WEBHOOK_SECRET) (rawBody enabled in main.ts). payment_intent.succeeded → Payment.succeeded → booking onPaymentSucceeded (confirm, booking reference, notification). payment_intent.payment_failed → Payment.failed; booking stays pending_payment.
POST /api/payments/:id/retry → new attempt while the hold is valid.
Testing in Swagger (no frontend): accept an optional testPaymentMethod ("pm_card_visa" succeeds, "pm_card_chargeDeclined" fails) that confirms the PaymentIntent server-side. Run the Stripe CLI stripe listen --forward-to localhost:4000/api/payments/webhook to receive webhooks locally.
6.4 Cancellation & refund (FLT-09, FLT-26, HTL-10, HTL-21, PAY-03)
Refund % rule: use the tier with the highest daysBefore not exceeding the days remaining; if none applies → 0%. Days remaining = whole days until departure (flights) / until the check-in date (hotels).
Round-trip: the outbound segment's tier is used, whole booking cancelled (FLT-12).
Provider-initiated cancellation (FLT-06) = 100%.
Show the amount first: GET /api/flight-bookings/:id/refund-preview, GET /api/hotel-bookings/:id/refund-preview; then POST .../cancel.
If refund > 0 → PaymentsService.createRefund() (Stripe Refunds API), Refund.status pending → refunded/failed; notify the user (PAY-03, GEN-01).
6.5 Itinerary days & groups (ITN-05/07/08/09) — M7
Store days as an ordered array. Never store day numbers or dates: dayNumber = index + 1, date = startDate + index days. Consecutive days with the same cityId form a group ({ cityId, fromDay, toDay, dayCount, budgetSubtotal }) — computed in every response. Max 60 days. PATCH /days/reorder body { "dayId": "...", "newPosition": 3 }. Declare the reorder route before :dayId routes.

6.6 Exchange rates (ITN-18) — M2 service, M7 uses it
Cron once per day (@Cron(CronExpression.EVERY_DAY_AT_1AM), plus fetch on startup if today's rates are missing) calls FXRatesAPI with FXRATES_API_KEY, stores an ExchangeRate document. convert() uses the latest cached rates and returns the rate date; if the API is down, the last cached rates are used. Unsupported currency → 400. The key is never sent to clients. Booking prices are never converted (PAY-04).

6.7 Image uploads (GEN-08) — M2 service
Controller: @UseInterceptors(FileInterceptor('file')), @ApiConsumes('multipart/form-data'), @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } }), @UploadedFile() file. UploadsService accepts JPG or PNG only, max 5 MB, saves to backend/uploads/, returns { id, url: '/uploads/<file>' }. Limits per entity: 5 images per post, activity or hotel; 1 logo per airline — checked by the owning module.

6.8 Notifications (GEN-01) & audit log (GEN-07)
Notifications are required for: booking confirmation, cancellation and refund (M4, M6), flight schedule change (M3), account suspension (M1) and provider deactivation (M2). Example: notify(userId, 'BOOKING_CONFIRMED', 'Your booking ABC123 is confirmed', '/bookings/flights/<id>').
Audit log is required for admin actions (suspensions, deletions): M1 logs account suspend/reactivate, moderator creation, password reset; M2 logs provider deactivate/reactivate, report resolution, content hide/delete. 7. Task lists per member (do them IN ORDER)
Each table lists Method · Endpoint · Requirement · Who can call · Rules (from the official sheet). ⏳ = needs another member's code.

👤 MEMBER 1 — Team Leader: Core Platform, Auth & Accounts
Folders: src/common/, main.ts, app.module.ts, modules/auth, modules/users, modules/admin-accounts, modules/audit-logs, admin seed script. Requirements: ACC-01, 04, 05, 06, 07a, 08, 09, 11, 12, 13, 14, 15 (moderator accounts), 16, 18, 19, GEN-13.

Task order

Repo, main + develop, NestJS skeleton, all packages, all empty modules, main.ts, MongoDB Atlas, share .env privately. Push so everyone can start.
User + Session schemas.
Register (ACC-01), login with lockout (ACC-04, ACC-05), logout + refresh + 30-min idle expiry (ACC-06, ACC-19), GET /auth/me.
common/: JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard, @Roles(), @CurrentUser(), @AllowPasswordChangeRequired(), JwtUser, global exception filter, paginate() (page size 10), ParseObjectIdPipe. Merge immediately and tell the team.
AuditLog schema + AuditLogsService. Merge immediately.
Admin seed script (ACC-18) — npm run seed:admin, credentials from .env.
Change password (ACC-08), profile view/edit (ACC-09; ⏳ preferred-currency validation needs M5 Currency).
Admin: list accounts (ACC-14), suspend/reactivate users and moderators (ACC-15, ACC-16), reset password (ACC-07a) — with audit logs (⏳ suspension notification needs M6).
⏳ needs M3 Airline + M5 Hotel: create moderator (ACC-13).
⏳ needs M4 + M6 hasUpcomingConfirmed: deactivate own account (ACC-12).
Continuously: review and merge PRs. At the end: test all roles in Swagger, README, .env.example, merge develop → main (19/11).
Method Endpoint Req Who Rules (official sheet)
POST /api/auth/register ACC-01 Guest Body: name, email, password, acceptTerms. Email valid and unique (409 if registered). Password ≥ 8 characters with at least one letter and one digit. acceptTerms must be true. Role always user. Password stored as salted hash (GEN-13). Never return the hash
POST /api/auth/login ACC-04, ACC-05 Guest Email + password. Failure → generic "invalid email or password". Suspended → "account suspended". After 5 consecutive failed attempts, lock for 15 minutes with a lockout message; success resets the counter. Sets access_token + refresh_token httpOnly cookies; returns user (role, mustChangePassword) so the frontend can go to the role's home page. Deactivated users cannot log in
POST /api/auth/refresh ACC-06, ACC-19 Has refresh cookie Rotate refresh token, new access token; reject revoked or idle (> 30 min) sessions
POST /api/auth/logout ACC-06 Logged in Clear both cookies and revoke the refresh token on the server
PATCH /api/auth/change-password ACC-08 Logged in Current password + new password meeting ACC-01 rules; clears mustChangePassword
GET /api/auth/me ACC-04, ACC-19 Logged in Current user (id, name, email, role, providerId, mustChangePassword) — the frontend gets the user only from here
GET /api/users/me ACC-11 Logged in Own full profile
PATCH /api/users/me ACC-09 Logged in Edit name, phone number, preferred currency (must be a supported currency); save only if all fields are valid
DELETE /api/users/me ACC-12 User ⏳ Deactivate own account (body { "confirm": true }). Blocked while the user has upcoming Confirmed bookings (flight or hotel). Status deactivated, sessions revoked, cookies cleared. Effects on content: see 3.9
POST /api/admin/moderators ACC-13 Admin ⏳ Body: name, email, role (airline_moderator/hotel_moderator), providerId, temporaryPassword. Linked to exactly one existing airline/hotel. mustChangePassword = true. Audit log
GET /api/admin/accounts ACC-14 Admin Paginated: name, email, role, status, registration date. Search by name or email; filter by role and status
PATCH /api/admin/accounts/:id/suspend ACC-15, ACC-16 Admin Suspend a user or moderator: cannot log in, sessions revoked; existing bookings stay valid; content stays visible. Not for admins. Audit log + in-app notification (⏳ M6)
PATCH /api/admin/accounts/:id/reactivate ACC-15, ACC-16 Admin Status active; audit log
POST /api/admin/users/:id/reset-password ACC-07a Admin Set a temporary password for a user or moderator; mustChangePassword = true (must set a new valid password at next login); audit log
Milestone 2 frontend (later): layout, navbar, API client, login/register/profile, route protection, redirect-after-login (ACC-10), admin accounts page.

👤 MEMBER 2 — Blog, Moderation, Uploads & Exchange Rates
Folders: modules/blog, modules/reports, modules/admin-moderation, modules/uploads, modules/exchange-rates. Requirements: BLG-01–10, BLG-12, GEN-07 (viewer + deletion logs), GEN-08, GEN-09, GEN-10, ACC-15 (providers), ITN-18 (rates service).

Task order

UploadsService (GEN-08, see 6.7). Merge immediately — M3, M5, M7 need it.
ExchangeRate schema + ExchangeRatesService with daily cron and DB cache (6.6). Merge immediately — M7 needs it. (⏳ supported-currency check uses M5 Currency — add it when merged.)
Post, Comment, Like schemas.
Posts: create, get, mine, edit, delete, list by tag, search.
Comments, likes, tags.
Post images (uses your own UploadsService).
Report schema + report endpoint (GEN-09).
Admin: open reports, resolve (dismiss/hide/delete), direct hide/delete of posts and comments (GEN-10).
⏳ needs M1 guards: guards + ownership.
⏳ needs M1 AuditLog: audit-log viewer (GEN-07) + audit calls on your admin actions.
⏳ needs M6 Review + M7 Itinerary: extend GEN-10 hide/delete and reports to reviews and itineraries.
⏳ needs M7 Itinerary: author page with public itineraries (BLG-12).
⏳ needs M3 AirlinesService, M5 HotelsService, M6 NotificationsService: provider deactivate/reactivate (ACC-15).
Swagger docs, testing.
Method Endpoint Req Who Rules (official sheet)
POST /api/posts BLG-01 User Required title and body, optional tags and images; status draft or published. Published posts appear in the author's blog and in search
GET /api/posts BLG-02, BLG-09 Public Paginated published posts (not hidden, author not deactivated). ?tag= filter. ?q= keyword search in title, tags or author name, returning title, author, date, excerpt; search results ordered by interaction score (likes + comments) descending, newest first as tie-breaker. Empty result = empty list
GET /api/posts/mine BLG-03 User Own posts incl. drafts: title, status, date, like count, comment count (declare before :id)
GET /api/posts/:id BLG-02 Public (OptionalJwtAuthGuard) Title, author, date, body, tags, images, like count, comments. Drafts/hidden only for the author (and admins for hidden)
PATCH /api/posts/:id BLG-04, BLG-08 Author Edit own post (title, body, status, tags)
DELETE /api/posts/:id BLG-04 Author Delete own post (+ its comments, likes, images)
POST /api/posts/:id/comments BLG-05 User Comment on a published post; non-empty, max 500 characters; comments returned in chronological order
PATCH / DELETE /api/comments/:id BLG-07 Comment author Edit/delete own comment (same validation)
POST /api/posts/:id/like BLG-06 User Like once (unique index; 409 on duplicate); update likesCount
DELETE /api/posts/:id/like BLG-06 User Remove own like
POST /api/posts/:id/images BLG-10, GEN-08 Author JPG/PNG ≤ 5 MB, max 5 images per post
DELETE /api/posts/:id/images/:imageId BLG-10 Author Remove image
GET /api/tags/:tag/posts BLG-08 Public Published posts with that tag. Tags: max 5 per post, each max 30 characters (validated in create/edit)
GET /api/authors/:id BLG-12 Public ⏳ Author's name, join date, published posts and public itineraries
POST /api/reports GEN-09 User Report a post/comment/review/itinerary with a reason, at most once per item (409)
GET /api/admin/reports GEN-10 Admin Open reports (filter by type/status), paginated
PATCH /api/admin/reports/:id GEN-10 Admin Resolve with action: dismiss / hide / delete (hide = isHidden = true; delete removes content). Audit log
PATCH /api/admin/content/:type/:id/hide GEN-10 Admin Directly hide (or { "hidden": false } to unhide) any post, comment, review or itinerary. Hidden content visible only to its author and admins. Audit log
DELETE /api/admin/content/:type/:id GEN-10 Admin Directly delete any post, comment, review or itinerary. Audit log (GEN-07). For reviews, ask M6's service to recalculate the hotel rating
GET /api/admin/audit-logs GEN-07 Admin ⏳ Audit log list, filter by actor/action/date, paginated
PATCH /api/admin/providers/:type/:id/deactivate ACC-15 Admin ⏳ type = airline/hotel. isActive = false → listings hidden from search and cannot be booked; existing Confirmed bookings remain valid. In-app notification to the provider's moderator(s) and to users with upcoming confirmed bookings. Audit log
PATCH /api/admin/providers/:type/:id/reactivate ACC-15 Admin ⏳ isActive = true; notify; audit log
GET /api/exchange-rates/latest ITN-18 Public Latest cached rates and their date (useful for testing/demo)
Milestone 2 frontend (later): blog list/search (SSR), post & author pages (ISR), editor (SSR + client), likes/comments (client), admin moderation pages.

👤 MEMBER 3 — Airlines & Flights
Folders: modules/airlines, modules/flights. Requirements: FLT-01, 03, 04, 05, 06 (flight side), 08, 09, 11, 12 (search part), 15, 17, 30, GEN-06.

Task order

Airline schema + create/get/edit airline (FLT-01) + AirlinesService. Merge immediately.
Baggage policy (FLT-08) and cancellation tiers (FLT-09).
Flight schema (cabins with counters, see 6.1). Merge immediately.
⏳ needs M5 Airport: create flight (FLT-03) with time-zone conversion (GEN-06).
Cabins (FLT-04).
Flight details (FLT-17).
Flight search one-way + round-trip + filters + sort (FLT-11, FLT-12, FLT-15) + FlightsService.search(). Merge immediately — M7 needs it.
Status cron: Scheduled → Departed (FLT-30).
⏳ needs M2 UploadsService: airline logo.
⏳ needs M1 guards: guards + ownership (moderator only for user.providerId).
⏳ needs M4 hasBookings / findConfirmedUserIdsForFlight + M6 NotificationsService: edit flight (FLT-05).
⏳ needs M4 cancelAllForFlight: cancel flight (FLT-06).
Swagger docs, testing.
Method Endpoint Req Who Rules (official sheet)
POST /api/airlines FLT-01 Admin Create airline profile: name, code (unique)
GET /api/airlines/:id FLT-01 Public Profile, baggage policy, cancellation tiers
PATCH /api/airlines/:id FLT-01 Airline mod (own) Edit name, code, logo
POST /api/airlines/:id/logo FLT-01, GEN-08 Airline mod (own) ⏳ Upload logo — 1 logo per airline (replaces the old one), JPG/PNG ≤ 5 MB
PUT /api/airlines/:id/baggage-policy FLT-08 Airline mod (own) Price per extra bag (> 0) and max extra bags per passenger (≥ 0). Each extra bag has the same max weight as the cabin's free allowance
PUT /api/airlines/:id/cancellation-policy FLT-09 Airline mod (own) List of tiers { daysBefore (integer ≥ 0, unique), refundPercent (0–100) }. Rule in 6.4
POST /api/flights FLT-03 Airline mod ⏳ Flight number, departure & arrival airports (only from the seeded list — FLT-02), departure & arrival date-times in each airport's local time, stored in UTC. Reject: identical airports; arrival not after departure (compared in UTC); departure in the past; duplicate flight number for the same airline on the same departure date. Status scheduled
POST /api/flights/:id/cabins FLT-04 Airline mod (own) Cabin class from {Economy, Premium Economy, Business, First}, each at most once per flight; seat count (whole number > 0), price (> 0), free baggage allowance (bag count), max weight (kg) per bag
PATCH /api/flights/:id/cabins/:cabinId FLT-04, FLT-05 Airline mod (own) Change price / seat count. Seat count cannot go below seats booked + held (6.1). Price changes do not affect existing bookings
PATCH /api/flights/:id FLT-05 Airline mod (own) ⏳ Only Scheduled flights. Edit departure/arrival times (same validation as FLT-03). Airports cannot be changed once the flight has any booking. Any time change → in-app notification to passengers with Confirmed bookings
POST /api/flights/:id/cancel FLT-06 Airline mod (own) ⏳ Body { "confirm": true }. Only Scheduled. Flight → cancelled, hidden from search; then call FlightBookingsService.cancelAllForFlight() (all Confirmed bookings → Cancelled with 100% refund, pending holds released, passengers notified)
GET /api/flights/search FLT-11, FLT-12, FLT-15 Public Query: from (airport id), to, departDate (local date at the departure airport), optional returnDate (round-trip → { outbound: [...], return: [...] }), adults, children, infants, optional cabinClass, minPrice, maxPrice (inclusive; 400 if min > max), sortBy = price/duration/departureTime. Lists Scheduled flights of active airlines on that date whose cabins have available seats ≥ adults + children (infants take no seat). Each result: airline, flight number, local times, duration, cabins with price and seats left. Empty → empty list ("no flights found"). Paginated
GET /api/flights/:id FLT-17 Public Airline, flight number, airports, local departure/arrival times, duration, each cabin (price, seats remaining, baggage allowance), airline cancellation policy
(cron) — FLT-30 System Every minute: Scheduled flights whose departure time has passed → departed. Only Scheduled flights are searchable, editable or bookable
Milestone 2 frontend (later): flight search/results (SSR), flight details, airline moderator dashboard.

👤 MEMBER 4 — Flight Bookings & Payments (Stripe)
Folders: modules/flight-bookings, modules/payments. Requirements: FLT-12 (booking part), 19, 21, 22, 23, 25, 26, 29, FLT-06 (bookings part), PAY-01, 02, 03, 04, GEN-11 (flights).

Task order

Stripe test account; keys in .env (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET).
Payment, Refund, FlightBooking schemas.
PaymentsService: createPayment, cancelPayment, createRefund, calculateRefundPercent + POST /api/payments. Merge immediately — M6 needs it.
Webhook, retry, get payment, get refund.
Policies + accept-policies (dispatch by type to the booking service).
⏳ needs M3 Flight: booking summary with passenger rules (FLT-12, FLT-19, FLT-21).
⏳ needs M3 Flight: seat hold (FLT-22, 6.1) + expiry cron.
onPaymentSucceeded → confirm, reference, e-ticket PDF (FLT-23).
My bookings (FLT-25), refund preview + cancel (FLT-26, PAY-03).
cancelAllForFlight, findConfirmedUserIdsForFlight, hasBookings, hasUpcomingConfirmed (for M3, M1). Merge.
Moderator bookings per flight + CSV export (FLT-29).
Cron: Confirmed → Completed after the last segment has arrived (GEN-11).
⏳ needs M1 guards: guards + ownership.
⏳ needs M6 NotificationsService: notifications on confirmation, cancellation, refund.
Test: two simultaneous holds on the last seat → one gets 409; expired hold releases seats. Swagger docs.
Method Endpoint Req Who Rules (official sheet)
POST /api/flight-bookings FLT-12, FLT-19, FLT-21 User ⏳ Booking summary (no hold yet, nothing saved): outbound { flightId, cabinId }, optional return { flightId, cabinId }, passengers [{ fullName, dateOfBirth, documentNumber (passport/ID), extraBags?, extraBagsWeightKg? }]. Passenger type from date of birth: adult 12+, child 2–11, infant < 2. At least one adult; no more infants than adults. Adults & children pay the cabin fare and take a seat; infants pay 10% of the fare and take no seat. Extra bags per passenger ≤ airline max, weight per bag ≤ cabin max; fee = bags × extra-bag price, added to total. Returns flight(s), passengers, baggage, total
POST /api/flight-bookings/hold FLT-22 User ⏳ Same body ("proceed to payment"). Re-validates, atomically reserves the seats only if enough remain (6.1), creates booking pending_payment held 10 minutes; round-trip = one booking, two segments. Concurrent requests never overbook (409). Fares stored at booking time
GET /api/flight-bookings FLT-25 User Own bookings ?group=upcoming|past|cancelled: reference, flight, date, passengers, cabin, status. Paginated
GET /api/flight-bookings/:id FLT-25 User (own) Full details incl. payment and refund status (PAY-03)
GET /api/flight-bookings/:id/refund-preview FLT-26 User (own) Refund amount from the accepted airline tiers (outbound segment for round-trip)
POST /api/flight-bookings/:id/cancel FLT-26 User (own) { "confirm": true }. Only Confirmed and before departure (after departure → 400). Booking cancelled, seats back to inventory, refund created if > 0 (PAY-03), notification
GET /api/flight-bookings/:id/e-ticket FLT-23 User (own) Only Confirmed: downloadable PDF (pdfkit) with reference, passengers, flights (local times), cabin, baggage
GET /api/flights/:id/bookings FLT-29 Airline mod (own airline) Bookings of that flight: reference, passenger names, cabin, seats, status (Confirmed or Cancelled); seats remaining per cabin. Paginated
GET /api/flights/:id/passengers/export FLT-29 Airline mod (own airline) Passenger list as CSV download
GET /api/bookings/:type/:id/policies PAY-02 User (own) Airline: cancellation tiers + baggage policy. Hotel: cancellation tiers + check-in/out times (from HotelBookingsService.getPolicies)
POST /api/bookings/:type/:id/accept-policies PAY-02 User (own) { "accepted": true } → store acceptance with timestamp (+ snapshot). Payment blocked until accepted
POST /api/payments PAY-01 User (own booking) { bookingType, bookingId, testPaymentMethod? }. Booking pending_payment, hold valid, policies accepted. Stripe PaymentIntent in the platform currency (PAY-04); store only Stripe payment ID, amount, currency, status. Returns clientSecret
POST /api/payments/:id/retry PAY-01 User (own) Retry after failure until the hold expires
GET /api/payments/:id PAY-01 User (own) / Admin Payment status
POST /api/payments/webhook PAY-01 Stripe (signature verified, no guard) payment_intent.succeeded → booking confirmed (FLT-23: held → booked seats, unique booking reference, notification). payment_intent.payment_failed → payment failed, booking stays pending
GET /api/refunds/:id PAY-03 User (own) / Admin Refund amount, percent, status Pending / Refunded / Failed
(cron) — FLT-22, PAY-01, GEN-11 System Every minute: expired holds → expired, release seats, cancel the PaymentIntent. Confirmed bookings whose flights are over → completed
Milestone 2 frontend (later): booking flow, policy acceptance, Stripe Elements checkout (shared with M6), my flight bookings, moderator bookings page.

👤 MEMBER 5 — Reference Data & Hotels
Folders: modules/reference-data, modules/hotels. Requirements: GEN-12, FLT-02, HTL-01, 02, 03, 04, 05, 06, 08, 09, 10, 11, 12, 15.

Task order

Reference data first (GEN-12, FLT-02): Country, City, Airport, Currency, Attraction schemas + seed script from the official datasets (npm run seed:reference, safe to re-run), run it on the shared DB, ReferenceDataService, lookup endpoints. Merge immediately — M3, M7, M1, M2 need it.
Hotel, Room schemas + HotelsService (findById, findRoomsByIds, setActive, updateRating, markRoomsReserved). Merge immediately — M6 needs it.
Create/edit hotel (HTL-01), check-in/out times (HTL-09), cancellation tiers (HTL-10).
Rooms (HTL-03), availability ranges (HTL-04).
⏳ needs M2 UploadsService: hotel photos.
⏳ needs M6 RoomNight: edit room / availability (HTL-05), block / deactivate / delete room (HTL-06).
⏳ needs M6 RoomNight: free rooms (HTL-15) + getFreeRooms, hotel search (HTL-11, HTL-12) + HotelsService.search(). Merge — M7 needs it.
⏳ needs M6 RoomNight: room status calendar (HTL-08).
⏳ needs M6 Review: hotel details with rating and reviews (HTL-02).
⏳ needs M1 guards: guards + ownership.
Swagger docs, testing.
Method Endpoint Req Who Rules (official sheet)
— seed script GEN-12, FLT-02 — Seed countries, cities, airports (IATA code, name, city, country, IANA time zone) and supported currencies (codes listed in Countries.csv) + attractions, keeping the official identifiers
GET /api/airports FLT-02 Public Read-only list; search by code/name/city; paginated
GET /api/countries, /api/cities, /api/currencies GEN-12 Public Read-only lookups (/api/cities?countryId=)
POST /api/hotels HTL-01 Admin Create hotel: name, address, city and country (from reference data), description, star class, amenities
GET /api/hotels/:id HTL-02 Public Profile, photos, amenities, check-in/out times, cancellation policy, average rating and reviews (⏳ M6), and available rooms when ?checkIn&checkOut are given
PATCH /api/hotels/:id HTL-01, HTL-09 Hotel mod (own) Edit profile and standard check-in / check-out times
POST / DELETE /api/hotels/:id/photos(/:photoId) HTL-01, GEN-08 Hotel mod (own) ⏳ JPG/PNG ≤ 5 MB, max 5 photos per hotel
PUT /api/hotels/:id/policies HTL-09, HTL-10 Hotel mod (own) Check-in/out times + cancellation tiers { daysBefore (integer ≥ 0, unique), refundPercent (0–100) } — same rule as FLT-09
POST /api/hotels/:id/rooms HTL-03 Hotel mod (own) Room number/name unique within the hotel, type, number of beds, max occupancy (≥ 1), price per night (> 0)
PATCH /api/hotels/:id/rooms/:roomId HTL-05, HTL-06 Hotel mod (own) ⏳ Edit beds, occupancy, price, isActive. Price changes don't affect existing reservations. Deactivation rejected if it overlaps any Confirmed or Pending Payment reservation. Deactivated rooms are excluded from search
DELETE /api/hotels/:id/rooms/:roomId HTL-06 Hotel mod (own) ⏳ Only rooms that have never been reserved
POST /api/hotels/:id/rooms/:roomId/availability HTL-04 Hotel mod (own) Add a bookable date range — ranges must not overlap
PATCH /api/hotels/:id/rooms/:roomId/availability HTL-05, HTL-06 Hotel mod (own) ⏳ Edit/remove availability ranges (cannot remove dates with confirmed reservations); add/remove blocked ranges (rejected if overlapping a Confirmed or Pending Payment reservation)
GET /api/hotels/:id/availability HTL-08 Hotel mod (own) ⏳ ?from&to: each room's status per date: Available, Booked (with reservation reference) or Blocked
GET /api/hotels/search HTL-11, HTL-12 Public ⏳ cityId or countryId, checkIn, checkOut, guests, rooms (default 1). Check-out after check-in; check-in not in the past (400). Lists active hotels with at least rooms rooms free for the whole stay whose combined max occupancy covers the guests. Filters: minPrice/maxPrice (inclusive) on the price per night of the cheapest qualifying room; minRating (1–5; unrated hotels excluded when set). Sort by that price or by rating. Paginated
GET /api/hotels/:id/rooms/available HTL-15 Public ⏳ ?checkIn&checkOut: all rooms free for those dates (6.2) with type, beds, max occupancy, price per night and total stay price
Milestone 2 frontend (later): hotel search/results (SSR), hotel details, hotel moderator dashboard.

👤 MEMBER 6 — Notifications, Hotel Bookings, Reviews & Admin Bookings
Folders: modules/notifications, modules/hotel-bookings, modules/reviews, modules/admin-bookings. Requirements: GEN-01, HTL-16, 17, 18, 20, 21, 22, 23, 24, GEN-11 (hotels), ACC-17.

Task order

Notification schema + NotificationsService (notify, notifyMany). Merge immediately — everyone needs it.
Notification endpoints (GEN-01).
HotelBooking, RoomNight (unique index), Review schemas + HotelBookingsService.findRoomNights / hasActiveReservationOverlap. Merge immediately — M5 needs it.
⏳ needs M5 Room + M4 PaymentsService: hotel hold/booking (HTL-16, HTL-18, 6.2), policy callbacks, onPaymentSucceeded (HTL-17), expiry cron.
My reservations (HTL-20), hasUpcomingConfirmed.
⏳ needs M4 createRefund: refund preview + cancel (HTL-21).
Moderator reservations (HTL-22).
Cron: Confirmed → Completed after check-out (HTL-23, GEN-11).
Reviews (HTL-23, HTL-24) + HotelsService.updateRating.
⏳ needs M4 FlightBooking: admin bookings list (ACC-17).
⏳ needs M1 guards: guards + ownership.
Test: two users holding the same room for overlapping dates → one gets 409. Swagger docs.
Method Endpoint Req Who Rules (official sheet)
GET /api/notifications GEN-01 Logged in Own notifications (newest first) + unread count, paginated
PATCH /api/notifications/:id/read GEN-01 Logged in (own) Mark as read
PATCH /api/notifications/read-all GEN-01 Logged in Mark all as read
POST /api/hotel-bookings HTL-16, HTL-18 User ⏳ "Proceed to payment": hotelId, checkIn, checkOut, rooms: [{ roomId, adults, childrenAges: [0–17] }]. One or more rooms in the same hotel, same dates, one reservation. At least one adult per reservation. No room's guests may exceed its max occupancy. Check-out after check-in; check-in not in the past. Total = Σ over rooms of nights × that room's price at booking time. Holds all rooms together for 10 minutes as one pending_payment reservation (6.2); if any room overlaps a Confirmed reservation, an unexpired hold or a blocked range, the whole request is rejected and nothing is held (409). Returns summary incl. check-in/out times and policies
GET /api/hotel-bookings HTL-20 User Own reservations ?group=upcoming|past|cancelled: reference, hotel, rooms, dates, guests, total, status. Paginated
GET /api/hotel-bookings/:id HTL-20 User (own) Full details incl. payment and refund status
GET /api/hotel-bookings/:id/refund-preview HTL-21 User (own) Refund from the accepted hotel tiers on the full total
POST /api/hotel-bookings/:id/cancel HTL-21 User (own) ⏳ { "confirm": true }. Only Confirmed, before the check-in date, whole reservation only (no partial). → cancelled, all room-nights released, refund if > 0 (PAY-03), notification
GET /api/hotels/:id/reservations HTL-22 Hotel mod (own hotel) Reservations: guest, dates, status. Filter by status/date, paginated
POST /api/hotel-bookings/:id/review HTL-23 User (own) Only Completed reservations (Confirmed becomes Completed once check-out has passed). One rating (1–5) + optional review (max 1000 chars) per reservation, regardless of number of rooms. Recalculate hotel average rating
PATCH / DELETE /api/reviews/:id HTL-23 Review author Edit/delete own review; recalculate average rating
GET /api/hotels/:id/reviews HTL-24 Public Average rating, number of ratings, reviews newest first, paginated. Hidden reviews excluded; deactivated authors shown as "Deleted user"
GET /api/admin/bookings ACC-17 Admin ⏳ Read-only list of all flight and hotel bookings: reference, user, provider, dates, amount, status. Filters: type, status, date range. Paginated
(cron) — HTL-18, HTL-23, GEN-11 System Every minute: expired holds → expired, delete their room-nights, cancel PaymentIntent (PaymentsService.cancelPayment). Confirmed reservations past check-out → completed
onPaymentSucceeded (HTL-17): all rooms → Confirmed, RoomNight.holdExpiresAt = null, unique booking reference, HotelsService.markRoomsReserved, in-app notification with the reservation details.

Milestone 2 frontend (later): hotel booking flow, my reservations, reviews, notification bell (unread count), admin bookings page.

👤 MEMBER 7 — Itineraries & Budgeting
Folders: modules/itineraries. Requirements: ITN-01, 03, 05, 07, 08, 09, 10, 12, 14, 16, 18, 20, 21, 25, 26.

Task order

Itinerary schema (embedded days, activities, budget entries, transport costs — each subdocument has its own \_id; /api/activities/:id etc. find the parent itinerary by subdocument id).
Itinerary create/list/get/edit/delete (ITN-01, ITN-03) (⏳ country validation needs M5 — add when merged).
Days: add/edit/delete/reorder with renumbering and groups (ITN-05, 07, 08, 09 — see 6.5).
Activities (ITN-10).
Budget entries (ITN-14) and transport costs (ITN-16).
Budget summary without conversion (totals by category, by day, by group).
Public/private (ITN-20), public search and view (ITN-21), clone (ITN-21).
⏳ needs M2 ExchangeRatesService: currency conversion in the budget summary (ITN-18).
⏳ needs M2 UploadsService: activity images (ITN-12).
⏳ needs M5 HotelsService.search(): hotels for a city group (ITN-25).
⏳ needs M3 FlightsService.search() + M5 airports: flights for the itinerary (ITN-26).
⏳ needs M1 guards: guards + ownership on every private endpoint.
Swagger docs, testing.
Method Endpoint Req Who Rules (official sheet)
POST /api/itineraries ITN-01 User Title required, max 100 chars; one or more countries from the seeded list; start date. Private by default
GET /api/itineraries ITN-03 User Own itineraries: title, countries, start date, number of days, visibility; most recently updated first. Paginated
GET /api/itineraries/:id ITN-03, ITN-09 Owner Full details: days (number, date, city, notes, activities, budget), city groups with day count and budget subtotal
PATCH /api/itineraries/:id ITN-01, ITN-20 Owner Edit title, countries, start date (dates shift), visibility (isPublic) — setting Private removes it from public search immediately
DELETE /api/itineraries/:id ITN-01 Owner { "confirm": true }. Disappears from public search; clones made by others are unaffected
POST /api/itineraries/:id/days ITN-05, ITN-09 Owner Add day with required city (from the seeded city list) and notes, optional position. Max 60 days. Days numbered sequentially, dates from start date
PATCH /api/itineraries/:id/days/:dayId ITN-05 Owner Edit city and notes
DELETE /api/itineraries/:id/days/:dayId ITN-07 Owner { "confirm": true }. Remove day (+ its activities, budgets, transport costs); renumber, recalc dates and budget totals
PATCH /api/itineraries/:id/days/reorder ITN-08 Owner { dayId, newPosition }: move a day; renumber, recalc dates and groups
POST /api/itineraries/:id/days/:dayId/activities ITN-10 Owner Name, description, optional time, optional cost (+ currency)
PATCH / DELETE /api/activities/:id ITN-10 Owner Edit/delete activity
POST /api/activities/:id/images ITN-12, GEN-08 Owner ⏳ JPG/PNG ≤ 5 MB, max 5 images per activity
DELETE /api/activities/:id/images/:imageId ITN-12 Owner Remove image
POST /api/itineraries/:id/days/:dayId/budgets ITN-14 Owner category ∈ food, accommodation, in-city transport, activities; amount ≥ 0; currency (supported list); note
PATCH / DELETE /api/budgets/:id ITN-14 Owner Edit/delete entry
POST /api/itineraries/:id/transport-costs ITN-16 Owner mode, from-city, to-city, amount, currency, day
PATCH / DELETE /api/transport-costs/:id ITN-16 Owner Edit/delete
GET /api/itineraries/:id/budget-summary ITN-14, ITN-18 Owner (or anyone if public) Total by category and by day (+ per group). Totals include budget entries, activity costs (under Activities) and intercity transport. All amounts converted to the user's preferred currency (or ?currency=) using cached daily rates; response shows the rate date
GET /api/itineraries/public/search ITN-20, ITN-21 Public ?q= keyword matching title, country or city; filters minDays/maxDays, countryId or cityId. Only public, not hidden, owner not deactivated. Paginated (declare public/\* routes before :id)
GET /api/itineraries/public/:id ITN-21 Public Read-only view with author, days, activities and budget (404 if private/hidden)
POST /api/itineraries/:id/clone ITN-21 User Only public itineraries. Copy all days, activities and budgets; clone is private, credits the original author (originalAuthorId, clonedFromId) and is independent of the original
GET /api/itineraries/:id/hotels ITN-25 Owner ⏳ ?groupIndex&guests&rooms: for a city group, check-in = date of the group's first day, check-out = the day after its last day; reuses HotelsService.search() (HTL-11)
GET /api/itineraries/:id/flights ITN-26 Owner ⏳ ?originAirportId&tripType=one_way|round_trip&departDate?&returnDate?&adults...: flights to any airport in the city of the first day; outbound date defaults to the start date, return date to the last day's date; reuses FlightsService.search() (FLT-11, FLT-12)
Milestone 2 frontend (later): itinerary list/editor, budget panel, public search/detail, clone.

8. Git & GitHub rules
   main = stable milestone releases. develop = integration. Never commit directly to either.
   One branch per task, from the latest develop:
   git checkout develop
   git pull origin develop
   git checkout -b feature/FLT-03-create-flight

# ... work ...

git add .
git commit -m "feat(flights): create flight endpoint (FLT-03)"
git push -u origin feature/FLT-03-create-flight
Then on GitHub: Compare & pull request → base develop → Member 1 reviews and merges.
Branch names: feature/<REQ-ID>-<description>, fix/<REQ-ID>-<description>, docs/<description>.
Commits: Conventional Commits with requirement IDs (feat(auth): implement registration (ACC-01)). Never "update", "fix", "final".
PR title/description mention the requirement IDs and contain only related changes.
Pull develop into your branch often (git pull origin develop).
Never commit .env, keys, or the Mongo connection string.
AI log: add entries to the bottom of AI_PROMPTS.txt (format at the top of the file).
First-time setup for every member
git clone <repo-url>
cd <repo-folder>
git checkout develop
cd backend
npm install

# copy ../.env.example to .env and fill in the values Member 1 sends you privately

npm run start:dev

# open http://localhost:4000/api/docs

9. Optional bonuses (from requirements-bonus.csv) — ONLY after all mandatory work is done
   ID Bonus Owner
   ACC-02 Email verification link after registration; booking blocked until verified M1
   ACC-07 Forgot password by email: link expires after 30 min, single-use, invalidated by a newer request, response doesn't reveal if the email exists M1
   GEN-01-B Send GEN-01 notifications (+ moderator invitations) by email via SMTP, test inbox in development M6
   FLT-27 Change a Confirmed flight booking's date/flight (same route and cabin), pay fare difference or get refund of lower fare M4
   FLT-28 Seat selection M4
   HTL-26 Hotel moderator replies to a review M6
   ITN-27 Link booked flights and hotels to itinerary days, feeding the budget M7
   ITN-28 Export/print itinerary as PDF M7
   BLG-13 Attach an itinerary to a post M2
   BON-01 Admin analytics dashboard: bookings and revenue per provider over a period M6
   BON-02 Favourites list for hotels and public itineraries M5
   — Cloud deployment (frontend + backend) M1
10. Open questions (the sheet doesn't say — ask the TA; until answered use the default)
    Question Default we use
    Which platform currency (PAY-04)? USD (PLATFORM_CURRENCY in .env)
    Round-trip extra baggage: charged once or per segment? Charged per segment
    Passenger age (FLT-12) measured on which date? Age on the outbound departure date
    When does a flight booking become Completed (GEN-11)? When the last segment's arrival time has passed
    Does "Upcoming" (FLT-25, HTL-20) include pending_payment? No — only confirmed in the future
11. Definition of done (every endpoint)
    Works in Swagger UI (/api/docs) with example request bodies.
    DTO validation with field-level messages; wrong input → 400.
    Correct guard/role; ownership checked in the service.
    Lists paginated (page size 10) with the required filters/sorting.
    Every rule in its table row is implemented (limits, statuses, errors).
    Requirement ID in the commit message and PR.
    AI prompts logged in AI_PROMPTS.txt.
    You can explain the code yourself.
