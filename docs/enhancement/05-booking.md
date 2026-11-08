# Booking rules: the approved document, the code and the proof (8 Nov 2026)

The owner's "Booking rules (approved 8 Nov 2026)" against `BOOKING_RULES` (`src/assets/js/enquiry-schema.js`, shared
unchanged by the browser and the API) and `lib/bookings/availability.mjs` / `lib/enquiries/store.mjs`.

| Rule (the approved document) | The code before | Now |
|---|---|---|
| 2 vehicles with a driver at once | `vehicles: 2` | unchanged |
| **48 hours' notice** before a tour date or a transfer pickup | `minNoticeHours: 24` (the document was changed from 24 to 48 after D9 recorded 24) | `minNoticeHours: 48` |
| Pickups 04:00–23:00, Cape Town time | `transferHours` | unchanged |
| Holds: day tour or activity its whole date; the Garden Route its nights + 1 day; airport transfer 2 h; other transfer 3 h; a return its own interval | `holdsFor()` | unchanged |
| New, Contacted, Quoted, Confirmed hold; Closed, Cancelled release; flexible dates with no date hold nothing | `ACTIVE`, `holdsFor()` | unchanged |
| A day's vehicles set in the dashboard, 0 closes it, empty restores 2 | `day_capacity`, `capacityBetween()` | unchanged |
| Two requests for the last vehicle at the same moment: never overbooked; at worst both are asked to choose again | check, insert, re-check with the new row, remove it if over | unchanged (the approved behaviour) |

One central policy: the form offers dates and times from the same `BOOKING_RULES` and `earliestDate()` the API enforces;
the availability endpoint and the enquiry endpoint run the same `checkHolds()`; the dashboard's day counts feed both. No
production data was read, changed or backfilled.

## The notice at its boundaries (Cape Town is UTC+2 all year; no daylight saving)

- A transfer: the pickup must be at least 48 hours after the request (exactly 48 h is accepted; 47 h 59 min is not).
- A tour (a date only): the first date offered is the Cape Town date reached 48 hours from now. At 10:00 on a Monday the
  first tour date is Wednesday, whatever time the tour then starts; at 23:59:59 on Monday, still Wednesday; from 00:00 on
  Tuesday, Thursday. This keeps the reading the owner approved for 24 hours (D9), at 48.
- Known edge, unchanged: after 23:00 the first date the calendar offers for a transfer has no pickup time left (23:00
  that day is under 48 hours away); the form then says so for the time chosen. Offering the next day instead is a small
  change to `earliestDate` for transfers, left for the owner's word.

## The acceptance matrix (`test/booking-acceptance.test.mjs`, PGlite, the real store and availability code)

| # | The brief's case | Test | Result |
|---|---|---|---|
| 1 | Two overlapping bookings accepted at the default, the third rejected | `1 · two overlapping bookings fit the default two vehicles…` | pass |
| 2 | Closed and Cancelled release; reopening is checked again | `2 · Closed and Cancelled release the vehicle…` | pass |
| 3 | A day set to 0 blocks everything | `3 · a day closed in the dashboard (0 vehicles)…` | pass |
| 4 | A day set to 1; removing the override restores 2 | `4 · a day set to 1 vehicle takes one…` | pass |
| 5 | Flexible dates: no hold | `5 · flexible dates with no date: stored, holding nothing…` | pass |
| 6 | The Garden Route overlapping day tours (its last held day, and the day after) | `6 · a Garden Route package holds its nights plus one day…` | pass |
| 7 | The airport 2-hour edge | `7 · an airport transfer holds a vehicle for 2 hours…` | pass |
| 8 | The 3-hour other transfer | `8 · any other transfer holds a vehicle for 3 hours…` | pass |
| 9 | A return transfer is its own slot | `9 · a return transfer holds its own interval…` | pass |
| 10 | 48 hours, and 04:00 / 23:00 (03:59 and 23:01 refused) | `10 · 48 hours’ notice and pickups from 04:00 to 23:00…` | pass |
| 11 | Simultaneous conflicting requests | `11 · simultaneous requests for the last vehicle…`: through HTTP and the store; started together every racer loses, staggered exactly one wins; the booked timeline never exceeds capacity | pass |
| 12 | Time-zone safety | `12 · the same now gives the same… whatever the process time zone`: child processes in UTC, Johannesburg, New York and Auckland (each confirmed by its own offset) give identical results | pass |
| — | The messages | "48 hours’ notice", and never a promise of instant confirmation | pass |

The notice tests in `test/schema.test.mjs` were rewritten for 48 hours with exact messages and boundaries (00:00, 10:00,
23:59, 23:59:59.999 SAST; 21:59Z to 00:00Z). The whole matrix also passes under `TZ=Pacific/Auckland` and
`TZ=America/New_York`, and three runs in a row.

## Concurrency, as built

Neon is reached over HTTP, one statement per request, so the store does not hold a lock across the check and the insert.
Instead every request is checked, inserted, and checked again with itself counted; if the second check finds the
vehicles over, the request is deleted before anything is emailed and the visitor is asked to choose again. The approved
document describes exactly this ("at worst it asks both to choose again"). Test 11 proves no state is left over capacity;
a request is never emailed or shown as received unless it survived its second check.

## Messages that match reality

The acknowledgement says the request is "received, not yet confirmed"; the FAQ, the steps and the terms say every booking
is confirmed by the team; no page or email promises instant confirmation (`test/booking-acceptance.test.mjs`,
`test/enquiry-page.test.mjs`). The cloud suite's labels (`qa/enquiry-live.mjs`) now say 48 hours.
