-- Add created_at to discussion_coverage (omitted from the initial table).
alter table public.discussion_coverage
  add column if not exists created_at timestamptz not null default now();
