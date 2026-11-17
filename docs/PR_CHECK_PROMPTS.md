Pre-PR check prompts (one per member)
When to use: before every pull request. Go to the branch you want to merge, open a new AI chat (Codex, ChatGPT, Claude, …), copy your prompt below and paste it.

After the AI finishes:

Run the Swagger checklist it gives you yourself at http://localhost:4000/api/docs.
If it says READY FOR PR and your Swagger tests pass: git push (first time: git push -u origin <branch-name>).
On GitHub, open a PR into develop and paste the title and description the AI wrote.
Anything marked NEEDS MEMBER 1 → send it to Member 1, don't change it yourself.
Member 1 checks before merging: Files changed tab shows only that member's folders + AI_PROMPTS.txt, no .env, build passes, description says "Tested in Swagger".

👤 Member 1 — Core Platform, Auth & Accounts
Before I open a pull request, do a full final review of my branch. Read docs/TEAM_PLAN.md first (Sections 0, 3, 4, 5, 6 and the Member 1 section in Section 7), and docs/requirements/requirements-mandatory.csv for my requirement IDs.

I am Member 1 (team leader). I own: backend/src/common/, backend/src/main.ts, backend/src/app.module.ts, package.json, package-lock.json, .gitignore, .env.example, README.md, the admin seed script, and the modules auth, users, admin-accounts, audit-logs.

Rules:

- Never read, print or edit the real values in backend/.env. Never ask me for passwords or keys.
- Only edit files I own (listed above) and AI_PROMPTS.txt. Do not touch other members' modules. If another member's module needs changing, tell me instead of changing it.
- Do NOT push, open a PR or merge anything yourself. Stop at the end and wait for me.

Do these checks and report each one as PASS / FIXED / NEEDS OTHER MEMBER:

1. Git state
   - git fetch, then merge origin/develop into my branch; resolve conflicts only in files I own.
   - git status and git diff origin/develop...HEAD --stat: list every changed file and confirm I only changed files I own (plus AI_PROMPTS.txt).
   - Confirm backend/.env is not tracked (git ls-files backend/.env returns nothing), .gitignore ignores .env, and no file contains a real connection string, password or key (search for "mongodb+srv://", "sk*test*", "sk*live*", "whsec\_", and the admin seed password).

2. Build and quality
   - npm run build must pass with no errors.
   - npm run lint (if it exists): fix lint errors in my files only.
   - npm run test (if tests exist): report results.
   - Every module folder in backend/src/modules/ is imported in app.module.ts exactly once, and no module other than app.module.ts calls MongooseModule.forRoot.
   - Every environment variable NAME the code reads (ConfigService / process.env, in ALL modules) is listed in .env.example with a placeholder value. Add any missing names to .env.example (names only, placeholder values).

3. Shared code that the whole team depends on (TEAM_PLAN Sections 3.5, 3.6, 3.10, 4)
   - Role enum values exactly: user, admin, airline_moderator, hotel_moderator.
   - Exist with these exact names and paths: common/guards/jwt-auth.guard.ts (JwtAuthGuard), OptionalJwtAuthGuard, common/guards/roles.guard.ts (RolesGuard), common/decorators/roles.decorator.ts (@Roles), common/decorators/current-user.decorator.ts (@CurrentUser), @AllowPasswordChangeRequired(), common/interfaces/jwt-user.interface.ts (JwtUser with sub, sid, email, role, providerId?), ParseObjectIdPipe, global exception filter with the error format in 3.10, common/utils/pagination.ts paginate() with page size 10 returning { data, page, limit, total, totalPages }.
   - JwtAuthGuard rejects: missing/invalid token, revoked or idle (> 30 min) sessions, suspended/deactivated users, and users with mustChangePassword (except endpoints marked @AllowPasswordChangeRequired). It updates the session's lastActivityAt.
   - AuditLogsService.log(actorId, action, targetType, targetId, details?) and UsersService.findById / findPublicProfile exist with the Section 4 signatures and are exported. My modules export their services and MongooseModule.
   - main.ts: global prefix /api, cookie-parser, CORS with credentials, ValidationPipe (whitelist, forbidNonWhitelisted, transform), rawBody enabled, /uploads served statically, Swagger at /api/docs.

4. Requirements (check every rule in my Section 7 table against the code)
   For each requirement implemented on this branch, list the endpoint, whether every rule is implemented, and anything missing:
   - ACC-01: name, email, password, acceptTerms required; valid + unique email (409); password ≥ 8 chars with at least one letter and one digit; acceptTerms must be true; role always user; password stored as bcrypt (salted) hash, never returned.
   - ACC-04: generic "invalid email or password" on failure; suspended → "account suspended"; deactivated cannot log in; response includes role and mustChangePassword.
   - ACC-05: 5 consecutive failures → locked 15 minutes with a lockout message; success resets the counter.
   - ACC-06 / ACC-19: access_token + refresh_token as httpOnly, Secure, SameSite cookies; tokens never in the response body; POST /api/auth/refresh rotates the refresh token; logout clears cookies and revokes the session on the server; 30 minutes without an authenticated request → session expires; GET /api/auth/me returns the current user.
   - ACC-07a: admin sets a temporary password; mustChangePassword = true.
   - ACC-08: current password required; new password follows ACC-01 rules; clears mustChangePassword.
   - ACC-09: edit only name, phone, preferredCurrency (must be a supported currency if Member 5's Currency model exists); all fields validated.
   - ACC-12: deactivation needs confirmation, is blocked while the user has upcoming Confirmed bookings (⏳ Member 4 + Member 6 hasUpcomingConfirmed), revokes sessions.
   - ACC-13: moderator linked to exactly one existing airline/hotel (⏳ Member 3 / Member 5), temporary password, mustChangePassword = true, audit log.
   - ACC-14: paginated (10) list with name, email, role, status, registration date; search by name or email; filter by role and status.
   - ACC-15 / ACC-16: suspend/reactivate users and moderators; suspended cannot log in and sessions are revoked; bookings stay valid; admins cannot be suspended; audit log; in-app notification (⏳ Member 6).
   - ACC-18: admins only created by the seed script (credentials from .env); no way to register as admin.
   - GEN-07: audit log entries for suspensions, reactivations, moderator creation, password resets.
     Fix missing rules in my files. If a rule depends on another member's code that isn't in develop yet, mark it "⏳ waiting for Member N" — do not fake their code.

5. Runtime test
   - Start the backend with npm run start:dev. If it cannot connect to MongoDB, report the exact error and stop this step.
   - Give me a short Swagger test checklist (http://localhost:4000/api/docs) for every endpoint on this branch: endpoint, example body, expected status — including: register with a weak password (400), duplicate email (409), 5 wrong logins then lockout, login → /auth/me works, logout → /auth/me returns 401, suspended user cannot log in. I will run it myself.

6. Prepare the commit and PR (do not push)
   - Add an entry to the bottom of AI_PROMPTS.txt for this session (Date, Student, Tool, Related Requirement, Prompt, How the output was used).
   - Stage only my files and AI_PROMPTS.txt, and commit with a Conventional Commit message including the requirement IDs, e.g. "feat(auth): login lockout and session expiry (ACC-05, ACC-06)".
   - Write a PR title and description for me to paste on GitHub: what was done, requirement IDs, "Tested in Swagger: ..." list, anything still waiting on other members, and anything other members must know (e.g. new guard names or env variables).

Finish with a summary table of all checks and tell me clearly: "READY FOR PR" or "NOT READY" with the reasons.
👤 Member 2 — Blog, Moderation, Uploads & Exchange Rates
Before I open a pull request, do a full final review of my branch. Read docs/TEAM_PLAN.md first (Sections 0, 3, 4, 5, 6 and the Member 2 section in Section 7), and docs/requirements/requirements-mandatory.csv for my requirement IDs.

Rules:

- Never read, print or edit the real values in backend/.env. Never ask me for passwords or keys.
- Only edit files inside my own module folders (blog, reports, admin-moderation, uploads, exchange-rates) and AI_PROMPTS.txt. Do not touch app.module.ts, main.ts, src/common/, package.json, package-lock.json, .gitignore, .env.example or other members' modules. If something outside my folders needs changing, tell me instead of changing it.
- Do NOT push, open a PR or merge anything yourself. Stop at the end and wait for me.

Do these checks and report each one as PASS / FIXED / NEEDS MEMBER 1:

1. Git state
   - git fetch, then merge origin/develop into my branch; resolve conflicts only inside my folders.
   - git status: list every changed file. Confirm all changes are inside my folders (plus AI_PROMPTS.txt).
   - git diff origin/develop...HEAD --stat: confirm no changes to app.module.ts, main.ts, src/common/, package.json, package-lock.json, .gitignore, .env.example.
   - Confirm backend/.env is not tracked (git ls-files backend/.env returns nothing) and no file contains a real connection string, password or API key (search for "mongodb+srv://", "sk*test*", "sk*live*", "whsec\_").

2. Build and quality
   - npm run build must pass with no errors.
   - npm run lint (if it exists): fix lint errors in my files only.
   - npm run test (if tests exist): report results.

3. Team conventions (TEAM_PLAN Section 3 and 4)
   - My modules use only MongooseModule.forFeature, never forRoot, no hard-coded database URLs.
   - Model names, field names and status values match Section 3.7 exactly (Post, Comment, Like, Report, ExchangeRate).
   - My modules export their services and MongooseModule.
   - UploadsService and ExchangeRatesService have exactly the signatures in Section 4.
   - I do not define copies of other members' schemas. If I read another member's model, I import it from their module.
   - Every list endpoint is paginated with page size 10 using the shared paginate() helper (if it exists in develop).
   - Every body/query uses a DTO with class-validator, and every controller has Swagger decorators (@ApiTags, @ApiOperation, @ApiProperty with examples).
   - Errors use Nest exceptions with correct status codes (400, 401, 403, 404, 409).
   - Guards: if Member 1's guards exist in develop, my endpoints use them with the correct roles and ownership checks; if not, list which endpoints still need guards.

4. Requirements (check every rule in my Section 7 table against the code)
   For each of my requirement IDs that is implemented on this branch (GEN-08, ITN-18 service, BLG-01..10, BLG-12, GEN-07, GEN-09, GEN-10, ACC-15 providers), list: the endpoint, whether every rule from the table/CSV is implemented, and anything missing. Examples of rules to verify: JPG/PNG only and max 5 MB; max 5 images per post; title and body required; max 5 tags, each max 30 chars; comment 1–500 chars; like at most once (409); search by title/tags/author name ordered by likes + comments then newest; report at most once per item; hidden content visible only to author and admins; deactivated authors' posts hidden; exchange rates fetched once per day, cached in DB, last cached rates used if the API fails, rate date returned.
   Fix missing rules inside my folders. If a rule depends on another member's code that isn't in develop yet, mark it "⏳ waiting for Member N" — do not fake their code.

5. Runtime test
   - Start the backend with npm run start:dev. If it cannot connect to MongoDB, report the exact error and stop this step.
   - Give me a short Swagger test checklist (http://localhost:4000/api/docs) for every endpoint on this branch: endpoint, example body, expected status. I will run it myself.

6. Prepare the commit and PR (do not push)
   - Add an entry to the bottom of AI_PROMPTS.txt for this session (Date, Student, Tool, Related Requirement, Prompt, How the output was used).
   - Stage only my files and AI_PROMPTS.txt, and commit with a Conventional Commit message that includes the requirement IDs, e.g. "fix(blog): complete post rules and validation (BLG-01, BLG-08)".
   - Write a PR title and description for me to paste on GitHub: what was done, requirement IDs, "Tested in Swagger: ..." list, and anything still waiting on other members.

Finish with a summary table of all checks and tell me clearly: "READY FOR PR" or "NOT READY" with the reasons.
👤 Member 3 — Airlines & Flights
Before I open a pull request, do a full final review of my branch. Read docs/TEAM_PLAN.md first (Sections 0, 3, 4, 5, 6 and the Member 3 section in Section 7), and docs/requirements/requirements-mandatory.csv for my requirement IDs.

Rules:

- Never read, print or edit the real values in backend/.env. Never ask me for passwords or keys.
- Only edit files inside my own module folders (airlines, flights) and AI_PROMPTS.txt. Do not touch app.module.ts, main.ts, src/common/, package.json, package-lock.json, .gitignore, .env.example or other members' modules. If something outside my folders needs changing, tell me instead of changing it.
- Do NOT push, open a PR or merge anything yourself. Stop at the end and wait for me.

Do these checks and report each one as PASS / FIXED / NEEDS MEMBER 1:

1. Git state
   - git fetch, then merge origin/develop into my branch; resolve conflicts only inside my folders.
   - git status: list every changed file. Confirm all changes are inside my folders (plus AI_PROMPTS.txt).
   - git diff origin/develop...HEAD --stat: confirm no changes to app.module.ts, main.ts, src/common/, package.json, package-lock.json, .gitignore, .env.example.
   - Confirm backend/.env is not tracked (git ls-files backend/.env returns nothing) and no file contains a real connection string, password or API key (search for "mongodb+srv://", "sk*test*", "sk*live*", "whsec\_").

2. Build and quality
   - npm run build must pass with no errors.
   - npm run lint (if it exists): fix lint errors in my files only.
   - npm run test (if tests exist): report results.

3. Team conventions (TEAM_PLAN Section 3 and 4)
   - My modules use only MongooseModule.forFeature, never forRoot, no hard-coded database URLs.
   - Model names, field names and status values match Section 3.7 exactly: Airline (name, code, logoUrl, isActive, baggagePolicy { extraBagPrice, maxExtraBagsPerPassenger }, cancellationTiers [{ daysBefore, refundPercent }]) and Flight (airlineId, flightNumber, departureAirportId, arrivalAirportId, departureTime, arrivalTime in UTC, status scheduled/cancelled/departed, cabins [{ cabinClass, price, totalSeats, availableSeats, heldSeats, bookedSeats, freeBags, maxBagWeightKg }]).
   - My modules export their services and MongooseModule.
   - AirlinesService (findById, setActive, getModeratorPolicies) and FlightsService (findById, search — also accepting toAirportIds: string[]) have the signatures in Section 4.
   - I do not define copies of other members' schemas. Airports/cities come from Member 5's reference-data module (Airport, City) — imported, not copied. I do not seed airports.
   - Seat counters are only changed with single atomic updates (TEAM_PLAN 6.1), never read-check-write.
   - Every list endpoint is paginated with page size 10 using the shared paginate() helper (if it exists in develop).
   - Every body/query uses a DTO with class-validator, and every controller has Swagger decorators (@ApiTags, @ApiOperation, @ApiProperty with examples).
   - Errors use Nest exceptions with correct status codes (400, 401, 403, 404, 409).
   - Guards: if Member 1's guards exist in develop, my endpoints use them with the correct roles (POST /api/airlines = admin; editing = airline_moderator of user.providerId only; search/details = public); if not, list which endpoints still need guards.

4. Requirements (check every rule in my Section 7 table against the code)
   For each requirement implemented on this branch, list the endpoint, whether every rule is implemented, and anything missing:
   - FLT-01: admin creates airline; airline moderator edits only their own (name, code, logo); 1 logo per airline, JPG/PNG ≤ 5 MB via Member 2's UploadsService (⏳ if not in develop).
   - FLT-03: airports must exist in the seeded list (FLT-02); times entered in each airport's local time zone and stored in UTC (GEN-06); reject identical airports, arrival not after departure (compared in UTC), departure in the past, duplicate flight number for the same airline on the same departure date.
   - FLT-04: cabin class from {economy, premium_economy, business, first}, each at most once per flight; seat count whole number > 0; price > 0; free bag count; max weight per bag (kg).
   - FLT-05: only Scheduled flights editable; airports cannot change once the flight has any booking (⏳ Member 4 hasBookings); seat count never below booked + held; price changes don't affect existing bookings; any time change notifies passengers with Confirmed bookings (⏳ Member 4 + Member 6).
   - FLT-06: confirmation required; only Scheduled; flight → cancelled and hidden from search; calls FlightBookingsService.cancelAllForFlight (⏳ Member 4).
   - FLT-08: extra bag price > 0; max extra bags per passenger ≥ 0.
   - FLT-09: tiers with unique daysBefore (integer ≥ 0) and refundPercent 0–100.
   - FLT-11: search by from, to, departDate (local date at the departure airport), passenger counts; only Scheduled flights of active airlines; available seats ≥ adults + children (infants take no seat); empty result = empty list.
   - FLT-12 (search part): round-trip returns outbound and return options; optional cabinClass filter.
   - FLT-15: minPrice/maxPrice inclusive, 400 if min > max, other criteria preserved; sort by price, duration or departure time.
   - FLT-17: details show airline, flight number, airports, local departure/arrival times, duration, each cabin with price, seats remaining, baggage allowance, and the airline's cancellation policy.
   - FLT-30: cron sets Scheduled flights whose departure time has passed to departed; only Scheduled flights are searchable, editable or bookable.
   - GEN-06: responses show local times using the airport's IANA time zone.
     Fix missing rules inside my folders. If a rule depends on another member's code that isn't in develop yet, mark it "⏳ waiting for Member N" — do not fake their code.

5. Runtime test
   - Start the backend with npm run start:dev. If it cannot connect to MongoDB, report the exact error and stop this step.
   - Give me a short Swagger test checklist (http://localhost:4000/api/docs) for every endpoint on this branch: endpoint, example body (using real airport ids from the seeded data), expected status — including the FLT-03 rejection cases and a search with min > max. I will run it myself.

6. Prepare the commit and PR (do not push)
   - Add an entry to the bottom of AI_PROMPTS.txt for this session (Date, Student, Tool, Related Requirement, Prompt, How the output was used).
   - Stage only my files and AI_PROMPTS.txt, and commit with a Conventional Commit message that includes the requirement IDs, e.g. "feat(flights): flight search with filters and sorting (FLT-11, FLT-15)".
   - Write a PR title and description for me to paste on GitHub: what was done, requirement IDs, "Tested in Swagger: ..." list, and anything still waiting on other members.

Finish with a summary table of all checks and tell me clearly: "READY FOR PR" or "NOT READY" with the reasons.
👤 Member 4 — Flight Bookings & Payments (Stripe)
Before I open a pull request, do a full final review of my branch. Read docs/TEAM_PLAN.md first (Sections 0, 3, 4, 5, 6 and the Member 4 section in Section 7), and docs/requirements/requirements-mandatory.csv for my requirement IDs.

Rules:

- Never read, print or edit the real values in backend/.env. Never ask me for passwords or keys (Stripe keys included).
- Only edit files inside my own module folders (flight-bookings, payments) and AI_PROMPTS.txt. Do not touch app.module.ts, main.ts, src/common/, package.json, package-lock.json, .gitignore, .env.example or other members' modules. If something outside my folders needs changing, tell me instead of changing it.
- Do NOT push, open a PR or merge anything yourself. Stop at the end and wait for me.

Do these checks and report each one as PASS / FIXED / NEEDS MEMBER 1:

1. Git state
   - git fetch, then merge origin/develop into my branch; resolve conflicts only inside my folders.
   - git status: list every changed file. Confirm all changes are inside my folders (plus AI_PROMPTS.txt).
   - git diff origin/develop...HEAD --stat: confirm no changes to app.module.ts, main.ts, src/common/, package.json, package-lock.json, .gitignore, .env.example.
   - Confirm backend/.env is not tracked (git ls-files backend/.env returns nothing) and no file contains a real connection string, password or API key (search for "mongodb+srv://", "sk*test*", "sk*live*", "whsec*", "pk_test*").

2. Build and quality
   - npm run build must pass with no errors.
   - npm run lint (if it exists): fix lint errors in my files only.
   - npm run test (if tests exist): report results.

3. Team conventions (TEAM_PLAN Section 3 and 4)
   - My modules use only MongooseModule.forFeature, never forRoot, no hard-coded database URLs.
   - Model names, field names and status values match Section 3.7 / 3.8 exactly: FlightBooking (status only pending_payment, confirmed, completed, expired, cancelled), Payment (status pending/succeeded/failed/cancelled), Refund (status pending/refunded/failed).
   - Payment stores ONLY Stripe payment ID, amount, currency, status (+ bookingType, bookingId, userId) — no card data.
   - All prices, payments and refunds use the single PLATFORM_CURRENCY (PAY-04).
   - My modules export their services and MongooseModule (with forwardRef where modules import each other).
   - PaymentsService (createPayment, cancelPayment, createRefund, calculateRefundPercent) and FlightBookingsService (cancelAllForFlight, findConfirmedUserIdsForFlight, hasBookings, hasUpcomingConfirmed, getPolicies, acceptPolicies, getAmountForPayment, onPaymentSucceeded) have the signatures in Section 4.
   - I do not define copies of other members' schemas (Flight, Airline come from Member 3; HotelBooking from Member 6).
   - Seat changes on Flight cabins use single atomic updates with availableSeats/heldSeats/bookedSeats (TEAM_PLAN 6.1).
   - Every list endpoint is paginated with page size 10 using the shared paginate() helper (if it exists in develop).
   - Every body/query uses a DTO with class-validator, and every controller has Swagger decorators (@ApiTags, @ApiOperation, @ApiProperty with examples).
   - Errors use Nest exceptions with correct status codes (400, 401, 403, 404, 409).
   - Guards: if Member 1's guards exist in develop, my endpoints use them with ownership checks (users only see their own bookings/payments/refunds; FLT-29 only for the airline moderator of that flight's airline; webhook has NO guard but verifies the Stripe signature); if not, list which endpoints still need guards.

4. Requirements (check every rule in my Section 7 table against the code)
   For each requirement implemented on this branch, list the endpoint, whether every rule is implemented, and anything missing:
   - FLT-12 (booking): passenger type from date of birth — adult 12+, child 2–11, infant < 2; at least one adult; no more infants than adults; adults and children pay the cabin fare and take a seat; infants pay 10% of the fare and take no seat; round-trip = one booking, two segments, one payment, one reference, cancelled as a whole using the outbound segment's tier.
   - FLT-19: full name, date of birth, passport/ID per passenger; extra bags per passenger ≤ airline max, weight per bag ≤ cabin max; baggage fee added to the total.
   - FLT-21: summary (flights, passengers, baggage, total) before payment, without holding seats.
   - FLT-22: "proceed to payment" atomically reserves seats only if enough remain; booking pending_payment held 10 minutes; expired → seats released; concurrent requests never overbook (409).
   - FLT-23: after verified payment: confirmed, held → booked seats, unique booking reference, in-app notification (⏳ Member 6), downloadable e-ticket PDF.
   - FLT-25: own bookings grouped upcoming / past / cancelled with reference, flight, date, passengers, cabin, status; full details.
   - FLT-26: refund preview; cancel only Confirmed and before departure (after departure → 400); seats back to inventory; refund from the accepted airline tiers (highest daysBefore not exceeding days remaining, else 0%).
   - FLT-29: per flight: reference, passenger names, cabin, seats, status (Confirmed or Cancelled), seats remaining per cabin, CSV export.
   - FLT-06 (bookings part): cancelAllForFlight → all Confirmed bookings cancelled with 100% refund, pending holds released, passengers notified.
   - PAY-01: Stripe test mode PaymentIntents; booking confirmed ONLY after the webhook verifies payment_intent.succeeded (signature checked with rawBody); failure leaves the booking pending_payment and allows retry until the hold expires; when the hold expires the PaymentIntent is cancelled.
   - PAY-02: policies shown (airline: cancellation + baggage; hotel: cancellation + check-in/out); acceptance required and stored with timestamp; payment blocked (400) until accepted; amount always computed on the server.
   - PAY-03: every positive refund goes through the Stripe Refunds API, is recorded, shows Pending/Refunded/Failed, and notifies the user.
   - GEN-11: only the transitions pending_payment → confirmed → completed, pending_payment → expired, confirmed → cancelled; cron marks confirmed bookings completed after the last segment arrives.
     Fix missing rules inside my folders. If a rule depends on another member's code that isn't in develop yet, mark it "⏳ waiting for Member N" — do not fake their code.

5. Runtime test
   - Start the backend with npm run start:dev. If it cannot connect to MongoDB, report the exact error and stop this step.
   - Give me a short Swagger test checklist (http://localhost:4000/api/docs) for every endpoint on this branch: endpoint, example body, expected status — including: summary with 2 infants and 1 adult (400), hold → accept policies → pay with testPaymentMethod pm_card_visa → confirmed (with the Stripe CLI command to forward webhooks), pay with pm_card_chargeDeclined → still pending, hold expiry releases seats, cancel → refund status. I will run it myself.

6. Prepare the commit and PR (do not push)
   - Add an entry to the bottom of AI_PROMPTS.txt for this session (Date, Student, Tool, Related Requirement, Prompt, How the output was used).
   - Stage only my files and AI_PROMPTS.txt, and commit with a Conventional Commit message that includes the requirement IDs, e.g. "feat(payments): stripe payment intents and webhook (PAY-01, PAY-02)".
   - Write a PR title and description for me to paste on GitHub: what was done, requirement IDs, "Tested in Swagger: ..." list, anything still waiting on other members, and any new env variable NAMES Member 1 must add to .env.example.

Finish with a summary table of all checks and tell me clearly: "READY FOR PR" or "NOT READY" with the reasons.
👤 Member 5 — Reference Data & Hotels
Before I open a pull request, do a full final review of my branch. Read docs/TEAM_PLAN.md first (Sections 0, 3, 4, 5, 6 and the Member 5 section in Section 7), and docs/requirements/requirements-mandatory.csv for my requirement IDs.

Rules:

- Never read, print or edit the real values in backend/.env. Never ask me for passwords or keys.
- Only edit files inside my own module folders (reference-data, hotels), my seed script, and AI_PROMPTS.txt. Do not touch app.module.ts, main.ts, src/common/, package.json, package-lock.json, .gitignore, .env.example or other members' modules. If something outside my folders needs changing (e.g. adding a "seed:reference" script to package.json), tell me instead of changing it.
- Never drop or delete collections in the shared database.
- Do NOT push, open a PR or merge anything yourself. Stop at the end and wait for me.

Do these checks and report each one as PASS / FIXED / NEEDS MEMBER 1:

1. Git state
   - git fetch, then merge origin/develop into my branch; resolve conflicts only inside my folders.
   - git status: list every changed file. Confirm all changes are inside my folders (plus AI_PROMPTS.txt).
   - git diff origin/develop...HEAD --stat: confirm no changes to app.module.ts, main.ts, src/common/, package.json, package-lock.json, .gitignore, .env.example.
   - Confirm backend/.env is not tracked (git ls-files backend/.env returns nothing) and no file contains a real connection string, password or API key (search for "mongodb+srv://", "sk*test*", "sk*live*", "whsec\_").

2. Build and quality
   - npm run build must pass with no errors.
   - npm run lint (if it exists): fix lint errors in my files only.
   - npm run test (if tests exist): report results.

3. Team conventions (TEAM_PLAN Section 3 and 4)
   - My modules use only MongooseModule.forFeature, never forRoot, no hard-coded database URLs (the seed script reads MONGODB_URI from .env).
   - Model names and fields match Section 3.7 exactly: Country, City, Airport (iataCode, name, cityId, countryId, timezone), Currency, Attraction, Hotel (… cityId, countryId, photos, stars, amenities, isActive, checkInTime, checkOutTime, cancellationTiers, averageRating, ratingsCount), Room (hotelId, name, type, beds, maxOccupancy, pricePerNight, availabilityRanges, blockedRanges, isActive, everReserved). No currency field on hotel prices (PAY-04).
   - My modules export their services and MongooseModule (with forwardRef if HotelsModule and HotelBookingsModule import each other).
   - ReferenceDataService (findCountry, findCity, findAirport, findAirportsByCity, isSupportedCurrency, listCurrencies) and HotelsService (findById, findRoomsByIds, search, getFreeRooms, setActive, updateRating, markRoomsReserved) have the signatures in Section 4.
   - I do not define copies of other members' schemas (RoomNight, HotelBooking, Review come from Member 6).
   - Every list endpoint is paginated with page size 10 using the shared paginate() helper (if it exists in develop).
   - Every body/query uses a DTO with class-validator, and every controller has Swagger decorators (@ApiTags, @ApiOperation, @ApiProperty with examples).
   - Errors use Nest exceptions with correct status codes (400, 401, 403, 404, 409).
   - Guards: if Member 1's guards exist in develop, my endpoints use them with the correct roles (POST /api/hotels = admin; editing = hotel_moderator of user.providerId only; lookups, search, details = public); if not, list which endpoints still need guards.

4. Requirements (check every rule in my Section 7 table against the code)
   For each requirement implemented on this branch, list the endpoint, whether every rule is implemented, and anything missing:
   - GEN-12 / FLT-02: seed countries, cities, airports (IATA code, name, city, country, IANA time zone), supported currencies (from Countries.csv) and attractions from the official datasets, keeping the official identifiers; the seed is safe to re-run (upsert, no duplicates); airports are read-only through the API.
   - HTL-01: admin creates a hotel; hotel moderator edits only their own (name, address, city and country, description, photos, star class, amenities); max 5 photos, JPG/PNG ≤ 5 MB via Member 2's UploadsService (⏳ if not in develop).
   - HTL-02: details show profile, photos, amenities, check-in/out times, cancellation policy, average rating and reviews (⏳ Member 6), and available rooms when dates are given.
   - HTL-03: room name unique within the hotel; type; beds; maxOccupancy ≥ 1; pricePerNight > 0.
   - HTL-04: bookable date ranges per room must not overlap.
   - HTL-05: edit beds, occupancy, price, availability; price changes don't affect existing reservations; availability cannot be removed for dates with confirmed reservations (⏳ Member 6 RoomNight).
   - HTL-06: block date ranges, deactivate or delete a room — rejected if overlapping any Confirmed or Pending Payment reservation; deactivated rooms excluded from search; delete only rooms never reserved.
   - HTL-08: per room per date: Available, Booked (with reservation reference) or Blocked.
   - HTL-09 / HTL-10: check-in/out times; cancellation tiers with unique daysBefore (integer ≥ 0) and refundPercent 0–100.
   - HTL-11: search by city OR country, checkIn, checkOut, guests, rooms (default 1); check-out after check-in; check-in not in the past (400); only active hotels with at least that many rooms free for the whole stay (inside availability ranges, not blocked, no active RoomNight) whose combined max occupancy covers the guests.
   - HTL-12: min/max price (inclusive) on the price per night of the cheapest qualifying room; minRating 1–5 excludes unrated hotels; sort by that price or by rating.
   - HTL-15: all rooms free for the dates with type, beds, max occupancy, price per night and total stay price.
     Fix missing rules inside my folders. If a rule depends on another member's code that isn't in develop yet, mark it "⏳ waiting for Member N" — do not fake their code.

5. Runtime test
   - Start the backend with npm run start:dev. If it cannot connect to MongoDB, report the exact error and stop this step.
   - Confirm (read-only) that the seeded collections exist and give me the document counts; do not re-seed unless I ask.
   - Give me a short Swagger test checklist (http://localhost:4000/api/docs) for every endpoint on this branch: endpoint, example body (using real city/country ids from the seeded data), expected status — including overlapping availability ranges (400), check-in in the past (400), and a search that should return no hotels. I will run it myself.

6. Prepare the commit and PR (do not push)
   - Add an entry to the bottom of AI_PROMPTS.txt for this session (Date, Student, Tool, Related Requirement, Prompt, How the output was used).
   - Stage only my files and AI_PROMPTS.txt, and commit with a Conventional Commit message that includes the requirement IDs, e.g. "feat(hotels): hotel search with price and rating filters (HTL-11, HTL-12)".
   - Write a PR title and description for me to paste on GitHub: what was done, requirement IDs, "Tested in Swagger: ..." list, anything still waiting on other members, and how to run the seed.

Finish with a summary table of all checks and tell me clearly: "READY FOR PR" or "NOT READY" with the reasons.
👤 Member 6 — Notifications, Hotel Bookings, Reviews & Admin Bookings
Before I open a pull request, do a full final review of my branch. Read docs/TEAM_PLAN.md first (Sections 0, 3, 4, 5, 6 and the Member 6 section in Section 7), and docs/requirements/requirements-mandatory.csv for my requirement IDs.

Rules:

- Never read, print or edit the real values in backend/.env. Never ask me for passwords or keys.
- Only edit files inside my own module folders (notifications, hotel-bookings, reviews, admin-bookings) and AI_PROMPTS.txt. Do not touch app.module.ts, main.ts, src/common/, package.json, package-lock.json, .gitignore, .env.example or other members' modules. If something outside my folders needs changing, tell me instead of changing it.
- Do NOT push, open a PR or merge anything yourself. Stop at the end and wait for me.

Do these checks and report each one as PASS / FIXED / NEEDS MEMBER 1:

1. Git state
   - git fetch, then merge origin/develop into my branch; resolve conflicts only inside my folders.
   - git status: list every changed file. Confirm all changes are inside my folders (plus AI_PROMPTS.txt).
   - git diff origin/develop...HEAD --stat: confirm no changes to app.module.ts, main.ts, src/common/, package.json, package-lock.json, .gitignore, .env.example.
   - Confirm backend/.env is not tracked (git ls-files backend/.env returns nothing) and no file contains a real connection string, password or API key (search for "mongodb+srv://", "sk*test*", "sk*live*", "whsec\_").

2. Build and quality
   - npm run build must pass with no errors.
   - npm run lint (if it exists): fix lint errors in my files only.
   - npm run test (if tests exist): report results.

3. Team conventions (TEAM_PLAN Section 3 and 4)
   - My modules use only MongooseModule.forFeature, never forRoot, no hard-coded database URLs.
   - Model names, field names and status values match Section 3.7 / 3.8 exactly: Notification, HotelBooking (status only pending_payment, confirmed, completed, expired, cancelled), RoomNight (roomId, hotelId, date, hotelBookingId, bookingReference, holdExpiresAt — with a UNIQUE index on { roomId, date }), Review (hotelBookingId unique, rating 1–5, text ≤ 1000, isHidden).
   - My modules export their services and MongooseModule (with forwardRef where PaymentsModule / HotelsModule import mine).
   - NotificationsService (notify, notifyMany) and HotelBookingsService (hasUpcomingConfirmed, findRoomNights, hasActiveReservationOverlap, getPolicies, acceptPolicies, getAmountForPayment, onPaymentSucceeded) have the signatures in Section 4.
   - I do not define copies of other members' schemas (Hotel, Room from Member 5; FlightBooking, Payment from Member 4; User from Member 1).
   - Every list endpoint is paginated with page size 10 using the shared paginate() helper (if it exists in develop).
   - Every body/query uses a DTO with class-validator, and every controller has Swagger decorators (@ApiTags, @ApiOperation, @ApiProperty with examples).
   - Errors use Nest exceptions with correct status codes (400, 401, 403, 404, 409).
   - Guards: if Member 1's guards exist in develop, my endpoints use them with ownership checks (users only see their own notifications, reservations and reviews; HTL-22 only for the hotel moderator of that hotel; ACC-17 admin only; GET hotel reviews public); if not, list which endpoints still need guards.

4. Requirements (check every rule in my Section 7 table against the code)
   For each requirement implemented on this branch, list the endpoint, whether every rule is implemented, and anything missing:
   - GEN-01: in-app notifications with unread count, list, mark as read (one and all).
   - HTL-16: one or more rooms in the same hotel for the same dates in one reservation; adults and children (ages 0–17) per room; at least one adult per reservation; no room's guests exceed its max occupancy; total = Σ over rooms of nights × that room's price at booking time.
   - HTL-18: check-out after check-in, check-in not in the past; all rooms held together for 10 minutes as one pending_payment reservation using RoomNight inserts inside ONE transaction (TEAM_PLAN 6.2); if any room overlaps a Confirmed reservation, an unexpired hold or a blocked range, the whole request is rejected (409) and nothing is held; expired → expired status, room-nights released, PaymentIntent cancelled.
   - HTL-17: after verified payment: confirmed, RoomNight.holdExpiresAt = null, unique booking reference, in-app notification with details.
   - HTL-20: own reservations grouped upcoming / past / cancelled with reference, hotel, rooms, dates, guests, total, status; full details.
   - HTL-21: refund preview on the full total using the accepted hotel tiers; cancel only Confirmed, before the check-in date, whole reservation only; rooms released; refund via PaymentsService.createRefund (⏳ Member 4); notification.
   - HTL-22: hotel moderator sees reservations for their own hotel (guest, dates, status).
   - HTL-23: Confirmed becomes Completed once check-out has passed (cron); one rating 1–5 + optional review ≤ 1000 chars per Completed reservation regardless of rooms; edit/delete own; hotel average rating recalculated via HotelsService.updateRating.
   - HTL-24: average rating, number of ratings, reviews newest first, paginated; hidden reviews excluded; deactivated authors shown as "Deleted user".
   - ACC-17: admin read-only list of all flight and hotel bookings with reference, user, provider, dates, amount, status; filters type, status, date range.
     Fix missing rules inside my folders. If a rule depends on another member's code that isn't in develop yet, mark it "⏳ waiting for Member N" — do not fake their code.

5. Runtime test
   - Start the backend with npm run start:dev. If it cannot connect to MongoDB, report the exact error and stop this step.
   - Give me a short Swagger test checklist (http://localhost:4000/api/docs) for every endpoint on this branch: endpoint, example body, expected status — including: two holds for the same room and overlapping dates (second → 409), a reservation with no adult (400), a room over max occupancy (400), review on a non-completed reservation (400), second review on the same reservation (409). I will run it myself.

6. Prepare the commit and PR (do not push)
   - Add an entry to the bottom of AI_PROMPTS.txt for this session (Date, Student, Tool, Related Requirement, Prompt, How the output was used).
   - Stage only my files and AI_PROMPTS.txt, and commit with a Conventional Commit message that includes the requirement IDs, e.g. "feat(hotel-bookings): multi-room hold with room-night locking (HTL-16, HTL-18)".
   - Write a PR title and description for me to paste on GitHub: what was done, requirement IDs, "Tested in Swagger: ..." list, and anything still waiting on other members.

Finish with a summary table of all checks and tell me clearly: "READY FOR PR" or "NOT READY" with the reasons.
👤 Member 7 — Itineraries & Budgeting
Before I open a pull request, do a full final review of my branch. Read docs/TEAM_PLAN.md first (Sections 0, 3, 4, 5, 6 and the Member 7 section in Section 7), and docs/requirements/requirements-mandatory.csv for my requirement IDs.

Rules:

- Never read, print or edit the real values in backend/.env. Never ask me for passwords or keys.
- Only edit files inside my own module folder (itineraries) and AI_PROMPTS.txt. Do not touch app.module.ts, main.ts, src/common/, package.json, package-lock.json, .gitignore, .env.example or other members' modules. If something outside my folder needs changing, tell me instead of changing it.
- Do NOT push, open a PR or merge anything yourself. Stop at the end and wait for me.

Do these checks and report each one as PASS / FIXED / NEEDS MEMBER 1:

1. Git state
   - git fetch, then merge origin/develop into my branch; resolve conflicts only inside my folder.
   - git status: list every changed file. Confirm all changes are inside my folder (plus AI_PROMPTS.txt).
   - git diff origin/develop...HEAD --stat: confirm no changes to app.module.ts, main.ts, src/common/, package.json, package-lock.json, .gitignore, .env.example.
   - Confirm backend/.env is not tracked (git ls-files backend/.env returns nothing) and no file contains a real connection string, password or API key (search for "mongodb+srv://", "sk*test*", "sk*live*", "whsec\_").

2. Build and quality
   - npm run build must pass with no errors.
   - npm run lint (if it exists): fix lint errors in my files only.
   - npm run test (if tests exist): report results.

3. Team conventions (TEAM_PLAN Section 3 and 4)
   - My module uses only MongooseModule.forFeature, never forRoot, no hard-coded database URLs.
   - The Itinerary model matches Section 3.7 exactly (ownerId, title, countryIds, startDate, isPublic, isHidden, clonedFromId, originalAuthorId, days [{ cityId, notes, activities [...], budgetEntries [...] }], transportCosts [...]). Day numbers and dates are NOT stored — they are calculated.
   - My module exports its service and MongooseModule.
   - I do not call FXRatesAPI directly — only Member 2's ExchangeRatesService.convert(). Images only through Member 2's UploadsService. Hotel/flight searches only through HotelsService.search() (Member 5) and FlightsService.search() (Member 3). Countries/cities/airports only through Member 5's ReferenceDataService. No copies of their schemas or logic.
   - Route order: "public/\*" routes are declared before ":id", and "days/reorder" before "days/:dayId".
   - Every list endpoint is paginated with page size 10 using the shared paginate() helper (if it exists in develop).
   - Every body/query uses a DTO with class-validator, and every controller has Swagger decorators (@ApiTags, @ApiOperation, @ApiProperty with examples).
   - Errors use Nest exceptions with correct status codes (400, 401, 403, 404, 409).
   - Guards: if Member 1's guards exist in develop, every private endpoint uses them and checks ownership (others get 404 for private itineraries); public search/view need no login; if not, list which endpoints still need guards.

4. Requirements (check every rule in my Section 7 table against the code)
   For each requirement implemented on this branch, list the endpoint, whether every rule is implemented, and anything missing:
   - ITN-01: title required, max 100 chars; one or more countries from the seeded list (⏳ Member 5); start date; private by default; delete needs confirmation, removes it from public search, clones made by others stay unaffected.
   - ITN-03: own itineraries with title, countries, start date, number of days, visibility; most recently updated first.
   - ITN-05: days with a required city from the seeded city list and notes; numbered sequentially; dates derived from the start date; max 60 days.
   - ITN-07 / ITN-08: deleting (with confirmation) or moving a day renumbers days and recalculates dates, groups and budget totals.
   - ITN-09: consecutive days in the same city are returned as a group with day count and budget subtotal.
   - ITN-10: activities with name, description, optional time, optional cost.
   - ITN-12: activity images JPG/PNG ≤ 5 MB, max 5 per activity (⏳ Member 2 UploadsService).
   - ITN-14: budget entries per day, amount ≥ 0, categories food / accommodation / in-city transport / activities, selected currency; total by category and by day; totals include activity costs (under activities) and intercity transport.
   - ITN-16: transport cost with mode, from-city, to-city, amount, currency, day.
   - ITN-18: all amounts converted to the user's preferred currency (supported list) via ExchangeRatesService; the rate date is shown; if the API is down, last cached rates are used; booking prices are not converted.
   - ITN-20: Public/Private; public is read-only to others; setting Private removes it from public search immediately.
   - ITN-21: public search by keyword (title, country or city), filters min/max days and country or city; read-only public view with author, days, activities, budget; hidden itineraries and those of deactivated owners excluded; clone copies all days, activities and budgets, is private, credits the original author, and is independent of the original.
   - ITN-25: hotels for a city group: check-in = date of the group's first day, check-out = the day after its last day, with guests and rooms from the user; reuses HTL-11 (⏳ Member 5).
   - ITN-26: one-way or round-trip flights from a chosen origin airport to any airport in the city of the first day; outbound defaults to the start date, return to the last day's date; reuses FLT-11 / FLT-12 (⏳ Member 3).
     Fix missing rules inside my folder. If a rule depends on another member's code that isn't in develop yet, mark it "⏳ waiting for Member N" — do not fake their code.

5. Runtime test
   - Start the backend with npm run start:dev. If it cannot connect to MongoDB, report the exact error and stop this step.
   - Give me a short Swagger test checklist (http://localhost:4000/api/docs) for every endpoint on this branch: endpoint, example body (using real country/city ids from the seeded data), expected status — including: title of 101 chars (400), a 61st day (400), reorder a day and check the new dates, negative budget (400), clone a public itinerary and check attribution, another user opening a private itinerary (404). I will run it myself.

6. Prepare the commit and PR (do not push)
   - Add an entry to the bottom of AI_PROMPTS.txt for this session (Date, Student, Tool, Related Requirement, Prompt, How the output was used).
   - Stage only my files and AI_PROMPTS.txt, and commit with a Conventional Commit message that includes the requirement IDs, e.g. "feat(itineraries): day reorder with recalculated dates (ITN-08, ITN-09)".
   - Write a PR title and description for me to paste on GitHub: what was done, requirement IDs, "Tested in Swagger: ..." list, and anything still waiting on other members.

Finish with a summary table of all checks and tell me clearly: "READY FOR PR" or "NOT READY" with the reasons.
