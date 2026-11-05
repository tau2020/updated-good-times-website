-- Multi-day tours. A multi-day request travels the tour path, with the tour's slug in
-- tour_slug; the nights the visitor asked for are kept here (0 = not sure yet, the operator suggests the length).
-- Additive and idempotent (forward-only; safe to re-run).

ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS nights integer NOT NULL DEFAULT 0;
ALTER TABLE enquiries DROP CONSTRAINT IF EXISTS enquiries_nights_check;
ALTER TABLE enquiries ADD CONSTRAINT enquiries_nights_check CHECK (nights BETWEEN 0 AND 30);
