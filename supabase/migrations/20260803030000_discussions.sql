-- Normalized discussion posts pulled from a source (e.g. Reddit threads).
-- `metadata` holds the raw provider payload; everything downstream reads the columns.
create table public.discussions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  external_id text not null,
  title text not null,
  body text,
  url text,
  author text,
  score integer not null default 0,
  num_comments integer not null default 0,
  upvote_ratio numeric,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discussions_source_external_unique unique (source_id, external_id)
);

create index discussions_user_id_idx on public.discussions (user_id);
create index discussions_source_id_idx on public.discussions (source_id);
create index discussions_tags_idx on public.discussions using gin (tags);

create trigger discussions_set_updated_at
  before update on public.discussions
  for each row execute function public.set_updated_at();
