-- Enquiry system — initial schema. Forward-only; every statement is idempotent.

CREATE TABLE IF NOT EXISTS enquiries (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number          text NOT NULL UNIQUE,
  name                      text NOT NULL,
  email                     text NOT NULL,
  phone                     text NOT NULL DEFAULT '',
  country                   text NOT NULL DEFAULT '',
  destination               text NOT NULL DEFAULT '',
  trip_type                 text NOT NULL DEFAULT '',
  travel_start              date,
  travel_end                date,
  travellers                integer NOT NULL DEFAULT 0,
  adults                    integer NOT NULL DEFAULT 0,
  children                  integer NOT NULL DEFAULT 0,
  budget                    text NOT NULL DEFAULT '',
  accommodation             text NOT NULL DEFAULT '',
  preferred_contact_method  text NOT NULL DEFAULT 'email',
  message                   text NOT NULL,
  status                    text NOT NULL DEFAULT 'NEW'
                            CHECK (status IN ('NEW','CONTACTED','CONSULTATION_SCHEDULED','PLANNING','QUOTE_SENT','FOLLOW_UP','CONFIRMED','CLOSED')), -- brand-guard-allow: inherited status set, migrated to the JAP set by 003
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  last_contacted_at         timestamptz,
  follow_up_count           integer NOT NULL DEFAULT 0,
  next_follow_up_at         timestamptz,
  scheduled_consultation_at timestamptz,
  calcom_booking_id         text, -- brand-guard-allow: unused inherited column, kept for the migration chain
  idempotency_key           text NOT NULL UNIQUE,
  dedupe_hash               text NOT NULL,
  ip_hash                   text NOT NULL DEFAULT '',
  user_agent                text NOT NULL DEFAULT '',
  page_url                  text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS enquiries_dedupe_idx ON enquiries (dedupe_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS enquiries_follow_up_idx ON enquiries (next_follow_up_at) WHERE status = 'NEW';
CREATE INDEX IF NOT EXISTS enquiries_email_idx ON enquiries (lower(email), created_at DESC);

CREATE TABLE IF NOT EXISTS email_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id          uuid REFERENCES enquiries (id) ON DELETE CASCADE,
  template            text NOT NULL,
  recipient           text NOT NULL,
  provider_message_id text,
  status              text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed')),
  error               text,
  attempts            integer NOT NULL DEFAULT 0,
  payload             jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_log_enquiry_idx ON email_log (enquiry_id, template);
CREATE INDEX IF NOT EXISTS email_log_failed_idx ON email_log (created_at) WHERE status = 'failed';

CREATE TABLE IF NOT EXISTS rate_limits (
  key          text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  count        integer NOT NULL DEFAULT 1
);
