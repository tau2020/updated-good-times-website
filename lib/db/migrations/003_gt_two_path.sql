-- Two request paths (tour enquiry, transfer request) in one table, and the status pipeline.
-- Additive and idempotent (forward-only; safe to re-run). Columns from 001/002 that only the inherited form used
-- (trip_type, budget, accommodation, travel_start/end, travelling_with, countries, experiences and the old scheduling
-- columns) are left in place with their defaults; the code neither writes nor reads them.
-- `destination` from 001 is reused for the transfer destination.

-- Path discriminator
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS enquiry_type text NOT NULL DEFAULT 'tour';
ALTER TABLE enquiries DROP CONSTRAINT IF EXISTS enquiries_enquiry_type_check;
ALTER TABLE enquiries ADD CONSTRAINT enquiries_enquiry_type_check CHECK (enquiry_type IN ('tour','transfer'));

-- Tour enquiry
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS tour_slug text NOT NULL DEFAULT '';
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS preferred_date date;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS dates_flexible boolean NOT NULL DEFAULT false;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS flexible_dates text NOT NULL DEFAULT '';
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS children_ages text NOT NULL DEFAULT '';
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS pickup_area text NOT NULL DEFAULT '';

-- Transfer request. pickup_at is the instant; the *_sast columns keep the date and time exactly as entered (Cape Town time).
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS transfer_type text NOT NULL DEFAULT '';
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS pickup_location text NOT NULL DEFAULT '';
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS pickup_at timestamptz;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS pickup_date_sast text NOT NULL DEFAULT '';
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS pickup_time_sast text NOT NULL DEFAULT '';
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS return_trip boolean NOT NULL DEFAULT false;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS return_at timestamptz;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS return_date_sast text NOT NULL DEFAULT '';
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS return_time_sast text NOT NULL DEFAULT '';
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS flight_number text NOT NULL DEFAULT '';
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS suitcases integer NOT NULL DEFAULT 0;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS oversized_items text NOT NULL DEFAULT '';
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS child_seats text NOT NULL DEFAULT '';

-- Both paths
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS special_requirements text NOT NULL DEFAULT '';
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS consent_at timestamptz;

-- The free-text note now lives in special_requirements; the inherited column stays but is no longer required input.
ALTER TABLE enquiries ALTER COLUMN message SET DEFAULT '';

-- Status pipeline: NEW → CONTACTED → QUOTED → CONFIRMED → CLOSED. Map inherited values first, then swap the check.
ALTER TABLE enquiries DROP CONSTRAINT IF EXISTS enquiries_status_check;
UPDATE enquiries SET status = 'QUOTED' WHERE status = 'QUOTE_SENT';
UPDATE enquiries SET status = 'CONTACTED' WHERE status IN ('CONSULTATION_SCHEDULED', 'PLANNING', 'FOLLOW_UP'); -- brand-guard-allow: maps inherited statuses
ALTER TABLE enquiries ADD CONSTRAINT enquiries_status_check CHECK (status IN ('NEW','CONTACTED','QUOTED','CONFIRMED','CLOSED'));

CREATE INDEX IF NOT EXISTS enquiries_type_created_idx ON enquiries (enquiry_type, created_at DESC);
CREATE INDEX IF NOT EXISTS enquiries_pickup_idx ON enquiries (pickup_at) WHERE enquiry_type = 'transfer';
