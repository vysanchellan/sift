-- Distilled knowledge entries derived from clusters/discussions.
-- This is the "knowledge base" a course mapper consumes.
create table public.knowledge_base_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cluster_id uuid references public.clusters(id) on delete set null,
  title text not null,
  content text not null,
  summary text,
  provider text,
  source_discussion_ids uuid[] not null default '{}',
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index knowledge_base_items_user_id_idx on public.knowledge_base_items (user_id);
create index knowledge_base_items_cluster_id_idx on public.knowledge_base_items (cluster_id);
create index knowledge_base_items_tags_idx on public.knowledge_base_items using gin (tags);

create trigger knowledge_base_items_set_updated_at
  before update on public.knowledge_base_items
  for each row execute function public.set_updated_at();
