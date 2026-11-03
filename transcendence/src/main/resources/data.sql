-- Drop the unique constraint on source_key so that resolved markets
-- can be regenerated with the same key in a future period.
ALTER TABLE IF EXISTS markets DROP CONSTRAINT IF EXISTS uk66atc2cqed8pglhfiphgit2yc;
