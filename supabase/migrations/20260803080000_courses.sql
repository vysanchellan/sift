-- User-created courses / learning paths assembled from the knowledge base.
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index courses_user_id_idx on public.courses (user_id);

create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();
