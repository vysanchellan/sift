-- Groups of related discussions, produced by the clustering step.
-- `discussion_ids` is a denormalized list so clusters stay cheap to read.
create table public.clusters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text,
  provider text,
  model text,
  discussion_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clusters_user_id_idx on public.clusters (user_id);

create trigger clusters_set_updated_at
  before update on public.clusters
  for each row execute function public.set_updated_at();
