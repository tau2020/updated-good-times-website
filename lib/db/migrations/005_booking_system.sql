-- Booking system: the vehicle time each request holds (availability and double-booking prevention), a
-- CANCELLED status, per-day vehicle counts, a history of every change, and single-use staff sign-in links.
-- Additive and idempotent (forward-only; safe to re-run).

-- The vehicle time a request holds, computed by the API from BOOKING_RULES (lib/bookings/availability.mjs).
-- A transfer with a return holds two intervals; a tour or package one. NULL: nothing held (flexible dates).
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS slot_start timestamptz;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS slot_end timestamptz;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS return_slot_start timestamptz;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS return_slot_end timestamptz;
CREATE INDEX IF NOT EXISTS enquiries_slot_idx ON enquiries (slot_start, slot_end) WHERE slot_start IS NOT NULL;
CREATE INDEX IF NOT EXISTS enquiries_return_slot_idx ON enquiries (return_slot_start, return_slot_end) WHERE return_slot_start IS NOT NULL;

-- A private note the team keeps on a request (dashboard only; never emailed).
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS staff_note text NOT NULL DEFAULT '';

-- CANCELLED: the booking will not happen (the operator declined it, or the customer cancelled). It frees the vehicle.
ALTER TABLE enquiries DROP CONSTRAINT IF EXISTS enquiries_status_check;
ALTER TABLE enquiries ADD CONSTRAINT enquiries_status_check CHECK (status IN ('NEW','CONTACTED','QUOTED','CONFIRMED','CLOSED','CANCELLED'));

-- Vehicles available on one Cape Town date when it differs from BOOKING_RULES.vehicles (0 closes the day).
CREATE TABLE IF NOT EXISTS day_capacity (
  day        date PRIMARY KEY,
  vehicles   integer NOT NULL CHECK (vehicles >= 0 AND vehicles <= 50),
  note       text NOT NULL DEFAULT '',
  updated_by text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- What happened to each request and who did it, shown in the dashboard.
CREATE TABLE IF NOT EXISTS enquiry_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL REFERENCES enquiries (id) ON DELETE CASCADE,
  at         timestamptz NOT NULL DEFAULT now(),
  actor      text NOT NULL DEFAULT '',
  kind       text NOT NULL,
  detail     text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS enquiry_events_enquiry_idx ON enquiry_events (enquiry_id, at);

-- Staff sign-in links are single use: a link's id is recorded the moment it is used.
CREATE TABLE IF NOT EXISTS admin_sign_ins (
  jti     text PRIMARY KEY,
  email   text NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now()
);
