-- Inherited from the source framework (kept so the migration chain 001 → 002 → 003 stays intact).
-- Adds columns the two-path form does not use; 003_gt_two_path.sql adds its fields. Additive and idempotent.

ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS travelling_with text NOT NULL DEFAULT '';
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS countries text NOT NULL DEFAULT '';
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS experiences text NOT NULL DEFAULT '';
