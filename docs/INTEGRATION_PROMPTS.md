# Integration prompts — replace stubs with the real services

**When to use:** once the members you depend on have merged their code into `develop` (check with Member 1). Each member's AI then replaces every temporary stub / ⏳ part with the **real service calls** from TEAM_PLAN Section 4.

**How:**
1. `git checkout develop` and `git pull origin develop`
2. Open a **new** AI chat, paste the **COMMON PART** below, then **your member section** right after it, and send.
3. When the AI says READY FOR PR: `git push -u origin <branch>`, open a PR into `develop`, and run your prompt from `docs/PR_CHECK_PROMPTS.md` if you changed a lot.
4. Member 1 runs the **final team integration check** (last section) after everyone's integration PRs are merged.

> If a dependency is **still not in develop**, the AI leaves that stub as it is and tells you who you are waiting for. Never fake another member's code.

---

## COMMON PART (paste this first, then your member section)

```
I am Member N in a 7-person NestJS + MongoDB Atlas project (Software Project I, Milestone 1: backend only). The other members have now merged their modules into develop. My task: replace every temporary stub / placeholder / direct-collection shortcut / "⏳ waiting for Member X" part in MY modules with the real services, exactly as defined in docs/TEAM_PLAN.md Section 4.

BEFORE DOING ANYTHING, read fully: docs/TEAM_PLAN.md (Sections 0, 3, 4, 5, 6, and my section in Section 7) and docs/requirements/requirements-mandatory.csv for my requirement IDs.

=== RULES (never break these) ===
1. Never read, print, copy or edit the real values in backend/.env. Never ask me for passwords or keys.
2. Only edit files inside MY module folders (listed in my section below) and AI_PROMPTS.txt. Never edit other members' modules, app.module.ts, main.ts, src/common/, package.json, tsconfig files or .env.example. If another member's service is missing a method I need, or has a different signature than TEAM_PLAN Section 4, STOP and write me a message to send to that member — do not change their code and do not work around it with a copy.
3. Import other members' modules in MY module's imports and inject their exported services. Use forwardRef(() => XModule) on my side only where two modules import each other, and tell me if the other side also needs forwardRef.
4. Never fake data: if a dependency is still a placeholder in develop, leave my stub as it is (fail closed, e.g. 501) and list it as "⏳ still waiting for Member N".
5. The database is shared: only create test data marked "[TEST-MN]", only delete what you created, never drop collections, never run seed scripts.
6. No destructive Git commands (no reset --hard, no force push, no rebase, no clean -fd). Do NOT push, open a PR or merge.

=== STEPS ===
Step 1 — Starting point
- git status (must be clean; otherwise STOP and list changes), git checkout develop, git pull origin develop.
- git checkout -b feature/integration-mN (N = my member number).

Step 2 — Inventory of my stubs
- Search my folders for: TODO, FIXME, stub, placeholder, "not implemented", NotImplementedException, 501, "waiting for", "Member 1".."Member 7", "M1".."M7", @InjectModel of models I don't own, and hard-coded collection names.
- Combine that with the list in my member section below.
- Make a table: stub/shortcut → file:line → needs which member's service/method → that service EXISTS in develop with the right signature? (YES / NO / DIFFERENT SIGNATURE).

Step 3 — Replace (only rows marked YES)
- Replace each stub with the real service call, following TEAM_PLAN Section 4 signatures and my Section 7 rules.
- Remove now-unused stub files, TODOs and placeholder code.
- Keep my endpoint paths, DTOs and response shapes unchanged unless a rule requires otherwise.
- Update/add unit tests (mock the other member's service).

Step 4 — Verify
- npm run build must pass; npm test must pass (report counts).
- npm run start:dev: if it connects, give me a Swagger test checklist for every endpoint whose behaviour changed (endpoint, who is logged in, example body, expected status), including the end-to-end flow across modules (e.g. "after X, a notification appears in GET /api/notifications"). You may run the requests yourself against http://localhost:4000 following rule 5. If MongoDB can't connect, say so and continue with build/tests only.
- git diff origin/develop --stat: confirm only my folders + AI_PROMPTS.txt changed.

Step 5 — Commit (do not push)
- Add an entry at the BOTTOM of AI_PROMPTS.txt (Date, Student: <name> (Member N), Tool, Related Requirement, Prompt summary, How the output was used).
- Commit with "refactor(<module>): replace stubs with real service integrations (<REQ-IDs>)".
- Write a PR title and description: each stub replaced → which service, "Tested in Swagger: …", and a "Still waiting" list (if any).
- Write a short message for each member whose service was missing or different (if any).

Finish with: the Step 2 table updated with DONE / ⏳ STILL WAITING, and "READY FOR PR" or "NOT READY". Then STOP.
```

---

## 👤 Member 1 — add after the common part

```
I am Member 1. My folders: auth, users, admin-accounts, audit-logs (+ src/common/, main.ts, app.module.ts are also mine, but this task should only need my modules).

Stubs / shortcuts to replace:
1. ACC-13 create moderator (POST /api/admin/moderators): currently reads the airlines/hotels collections directly. Replace with AirlinesService.findById(providerId) (Member 3) and HotelsService.findById(providerId) (Member 5): 404 if the provider doesn't exist; store providerType + providerId; one provider per moderator.
2. ACC-12 deactivate own account (DELETE /api/users/me): currently reads the booking collections directly. Replace with FlightBookingsService.hasUpcomingConfirmed(userId) (Member 4) and HotelBookingsService.hasUpcomingConfirmed(userId) (Member 6): block with 400 if either is true.
3. ACC-15 / ACC-16 suspension (PATCH /api/admin/accounts/:id/suspend and /reactivate): add the in-app notification via NotificationsService.notify(userId, 'ACCOUNT_SUSPENDED' / 'ACCOUNT_REACTIVATED', message) (Member 6).
4. ACC-09 PATCH /api/users/me: preferredCurrency must be a supported currency — use ReferenceDataService.isSupportedCurrency(code) (Member 5) instead of only checking the 3-letter format: 400 if unsupported.
Also check: every other member's module that imports from src/common/ or my modules still compiles, and no member copied a User/Session/AuditLog schema into their own folder (report it if they did, don't fix it).
```

---

## 👤 Member 2 — add after the common part

```
I am Member 2. My folders: blog, reports, admin-moderation, uploads, exchange-rates.
Note: TEAM_PLAN 3.2 allows me to @InjectModel('Review') and @InjectModel('Itinerary') to READ, set isHidden and DELETE them for moderation — that is allowed, not a shortcut. After deleting a review I must call Member 6's rating recalculation.

Stubs / shortcuts to replace:
1. ITN-18 exchange rates: unsupported-currency check currently uses the FX cache. Replace with ReferenceDataService.isSupportedCurrency(code) (Member 5): 400 for unsupported codes.
2. GEN-09 reports: existence checks for targetType 'review' (Member 6 Review model: exists and not hidden) and 'itinerary' (Member 7 Itinerary model: exists, public, not hidden) → 404 otherwise.
3. GEN-10 admin moderation: hide/unhide and delete for 'review' and 'itinerary' (reports resolution + direct /api/admin/content/:type/:id routes). After deleting or hiding a review, recalculate the hotel rating via Member 6's service (or HotelsService.updateRating via Member 6's method — check what exists).
4. BLG-12 author page (GET /api/authors/:id): replace the itinerary reader stub with the author's PUBLIC itineraries from Member 7 (public, not hidden).
5. ACC-15 providers (PATCH /api/admin/providers/:type/:id/deactivate and /reactivate): replace the 501 stub with AirlinesService.setActive(id, false/true) (Member 3) or HotelsService.setActive(id, false/true) (Member 5); notify the provider's moderator(s) (find users with role airline_moderator/hotel_moderator and that providerId via Member 1's model/service) and users with upcoming confirmed bookings (use what Members 4 and 6 expose — if there is no method to list them, notify only the moderators and write a message for Members 4/6); audit log; existing confirmed bookings stay valid.
```

---

## 👤 Member 3 — add after the common part

```
I am Member 3. My folders: airlines, flights.

Stubs / shortcuts to replace:
1. FLT-01 airline logo (POST /api/airlines/:id/logo): use UploadsService.saveImage / deleteImage (Member 2); max 1 logo per airline (replace + delete the old file).
2. FLT-03 / FLT-11 / FLT-17: airports must come from Member 5's reference data (ReferenceDataService.findAirport, Airport model with IANA timezone) — remove any local airport list or copy.
3. FLT-05 edit flight (PATCH /api/flights/:id): "airports cannot change once the flight has any booking" → FlightBookingsService.hasBookings(flightId) (Member 4). Any time change → NotificationsService.notifyMany(await FlightBookingsService.findConfirmedUserIdsForFlight(flightId), 'FLIGHT_SCHEDULE_CHANGED', message) (Members 4 + 6).
4. FLT-06 cancel flight (POST /api/flights/:id/cancel): after setting status cancelled, call FlightBookingsService.cancelAllForFlight(flightId) (Member 4), which cancels confirmed bookings with 100% refund, releases holds and notifies passengers.
5. Admin creation: POST /api/airlines must be admin-only via Member 1's guards; airline_moderator edits only user.providerId.
6. Make sure AirlinesService.setActive / findById / getModeratorPolicies and FlightsService.findById / search (with toAirportIds) exist and are exported exactly as in Section 4 — Members 1, 2, 4 and 7 depend on them.
```

---

## 👤 Member 4 — add after the common part

```
I am Member 4. My folders: flight-bookings, payments.

Stubs / shortcuts to replace:
1. Flights: use FlightsService.findById (Member 3) and the Flight cabin counters (availableSeats / heldSeats / bookedSeats) with atomic updates — remove any local copy of the Flight schema.
2. PAY-02 policies: GET /api/bookings/:type/:id/policies and accept-policies must dispatch type 'hotel' to HotelBookingsService.getPolicies / acceptPolicies (Member 6) and 'flight' to my FlightBookingsService. Same for getAmountForPayment and onPaymentSucceeded in the webhook.
3. Airline policies (baggage + cancellation tiers) via AirlinesService.getModeratorPolicies or findById (Member 3).
4. Notifications (GEN-01, FLT-23, FLT-26, PAY-03): NotificationsService.notify (Member 6) on booking confirmed, booking cancelled, refund created / refunded / failed.
5. FLT-29 (GET /api/flights/:id/bookings and passengers export): only the airline moderator of that flight's airline (check via FlightsService.findById + user.providerId).
6. Make sure FlightBookingsService.cancelAllForFlight, findConfirmedUserIdsForFlight, hasBookings, hasUpcomingConfirmed and PaymentsService.createPayment / cancelPayment / createRefund / calculateRefundPercent exist and are exported exactly as in Section 4 — Members 1, 3 and 6 depend on them.
7. End-to-end check: hold → accept policies → pay (testPaymentMethod pm_card_visa) → confirmed + notification; hotel booking payment through the same PaymentsService works with Member 6's callbacks.
```

---

## 👤 Member 5 — add after the common part

```
I am Member 5. My folders: reference-data, hotels.

Stubs / shortcuts to replace:
1. HTL-01 hotel photos (POST/DELETE /api/hotels/:id/photos): use UploadsService.saveImage / deleteImage (Member 2); max 5 photos.
2. HTL-05, HTL-06, HTL-08, HTL-11, HTL-12, HTL-15 availability: use Member 6's RoomNight model / HotelBookingsService.findRoomNights and hasActiveReservationOverlap (active = holdExpiresAt null or in the future): free rooms exclude active room-nights; blocking/deactivating/removing availability rejected if it overlaps a Confirmed or Pending Payment reservation; HTL-08 shows Booked with the reservation reference.
3. HTL-06 delete room: only if never reserved (everReserved, set by markRoomsReserved, which Member 6 calls).
4. HTL-02 hotel details: average rating, ratings count and reviews from Member 6 (Review model / service), hidden reviews excluded.
5. HTL-12 rating filter/sort: uses Hotel.averageRating / ratingsCount kept up to date by HotelsService.updateRating (called by Member 6).
6. Admin creation: POST /api/hotels admin-only via Member 1's guards; hotel_moderator edits only user.providerId.
7. Make sure ReferenceDataService (findCountry, findCity, findAirport, findAirportsByCity, isSupportedCurrency, listCurrencies) and HotelsService (findById, findRoomsByIds, search, getFreeRooms, setActive, updateRating, markRoomsReserved) exist and are exported exactly as in Section 4 — Members 1, 2, 3, 6 and 7 depend on them.
```

---

## 👤 Member 6 — add after the common part

```
I am Member 6. My folders: notifications, hotel-bookings, reviews, admin-bookings.

Stubs / shortcuts to replace:
1. HTL-16 / HTL-18 hotel booking: use HotelsService.findById / findRoomsByIds (Member 5) for hotel, rooms, availability ranges, blocked ranges, occupancy and price at booking time — remove any local copy of Hotel/Room.
2. Payments: PaymentsService.createPayment / cancelPayment / createRefund / calculateRefundPercent (Member 4). My HotelBookingsService must expose getPolicies, acceptPolicies, getAmountForPayment and onPaymentSucceeded so Member 4's webhook can call them (forwardRef where needed).
3. HTL-17 onPaymentSucceeded: also call HotelsService.markRoomsReserved(roomIds) (Member 5) and notify the user.
4. HTL-21 cancel: refund via PaymentsService.createRefund with the hotel tiers (calculateRefundPercent), notify the user.
5. HTL-23 / HTL-24 reviews: after create/edit/delete, recalculate and save the rating via HotelsService.updateRating(hotelId, avg, count) (Member 5). Expose a method Member 2 can call after deleting/hiding a review to recalculate.
6. HTL-24 deactivated authors shown as "Deleted user": use Member 1's UsersService.findPublicProfile / User status.
7. ACC-17 admin bookings (GET /api/admin/bookings): read Member 4's FlightBooking model for flight bookings (read-only) — remove any placeholder.
8. Make sure NotificationsService (notify, notifyMany) and HotelBookingsService (hasUpcomingConfirmed, findRoomNights, hasActiveReservationOverlap) exist and are exported exactly as in Section 4 — Members 1, 2, 3, 4 and 5 depend on them.
```

---

## 👤 Member 7 — add after the common part

```
I am Member 7. My folder: itineraries.

Stubs / shortcuts to replace:
1. ITN-01 / ITN-05 / ITN-16 / ITN-21: countries, cities and currencies must be validated with ReferenceDataService (Member 5): findCountry, findCity, isSupportedCurrency → 400 if unknown.
2. ITN-12 activity images: UploadsService.saveImage / deleteImage (Member 2); max 5 per activity.
3. ITN-18 budget summary: convert with ExchangeRatesService.convert(amount, from, to) (Member 2) into the user's preferredCurrency (Member 1's User) or ?currency=; return the rate date. Never call FXRatesAPI directly.
4. ITN-25 GET /api/itineraries/:id/hotels: HotelsService.search (Member 5) with check-in = first day of the group, check-out = the day after its last day, plus guests/rooms from the query.
5. ITN-26 GET /api/itineraries/:id/flights: FlightsService.search (Member 3) to any airport in the first day's city (ReferenceDataService.findAirportsByCity → toAirportIds); outbound defaults to the start date, return to the last day's date.
6. ITN-21 / BLG-12: public itineraries exclude hidden ones and those of deactivated owners (Member 1's User status). Expose a method Member 2 can call to list an author's public itineraries (and make sure the Itinerary model is exported for Member 2's moderation).
```

---

## 👤 Member 1 — FINAL TEAM INTEGRATION CHECK (after everyone's integration PRs are merged)

```
I am Member 1, the team leader. All members have merged their integration PRs into develop. Do a final read-only integration check before I merge develop into main for Milestone 1 (deadline 20/11).

Read docs/TEAM_PLAN.md (Sections 0, 3, 4, 5, 7, 11) and docs/requirements/requirements-mandatory.csv first.

Rules: never read or print backend/.env values; do NOT edit any file, commit, push or merge — only report. Shared database: only create data marked "[TEST-FINAL]" and delete only what you created; never drop collections or run seeds.

1. git checkout develop, git pull origin develop. npm run build and npm test must pass (report counts per module).
2. Search ALL modules for leftover TODO / FIXME / stub / placeholder / NotImplementedException / 501 / "waiting for" and list each with file:line and owner.
3. For every service in TEAM_PLAN Section 4, check it exists, is exported, and matches the signature; list mismatches with owner.
4. For every mandatory requirement ID in the CSV, map it to the endpoint(s) and module that implement it. List any ID with no implementation (owner from TEAM_PLAN 3.3).
5. Start the backend (npm run start:dev). List all Swagger tags/endpoints and confirm each module appears.
6. Run end-to-end flows against http://localhost:4000 (I'll do admin/moderator logins myself in Swagger if you need them — tell me which steps):
   a. register → login → /auth/me → profile → logout
   b. flight search → hold → accept policies → pay (test card) → confirmed + notification → cancel → refund
   c. hotel search → available rooms → hold → pay → confirmed → cancel → refund; overlapping hold → 409
   d. itinerary create → days → activities → budget → summary in another currency → make public → clone
   e. post → comment → like → report → admin hide → audit log
   f. admin deactivates an airline → it disappears from search; reactivate
7. Write me: a table of results (PASS/FAIL), a list of problems grouped by member with a ready-to-send message for each, and a clear verdict: "READY FOR MAIN" or "NOT READY" (with the blockers).
```
