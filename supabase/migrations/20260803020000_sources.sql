-- Content sources (provider abstraction): where discussions come from.
-- `kind` names the adapter (e.g. 'reddit'); `external_id` is the provider-side handle
-- (e.g. the subreddit name). The rest of the app depends on this table, not on a provider.
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  name text not null,
  external_id text,
  config jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  status text not null default 'active' check (status in ('active', 'paused', 'error', 'revoked')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sources_user_kind_external_unique unique (user_id, kind, external_id)
);

create index sources_user_id_idx on public.sources (user_id);
create index sources_kind_idx on public.sources (kind);

create trigger sources_set_updated_at
  before update on public.sources
  for each row execute function public.set_updated_at();
