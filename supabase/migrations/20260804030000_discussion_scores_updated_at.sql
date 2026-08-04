-- The discussion_scores table has had a `set_updated_at` trigger since
-- creation, but never the `updated_at` column it expects, so every UPDATE on
-- the table errored ("record new has no field updated_at"). Add the column to
-- match the trigger and the other tables.
alter table public.discussion_scores
  add column if not exists updated_at timestamptz not null default now();
