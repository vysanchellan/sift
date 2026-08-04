-- Links course sections to the discussions / knowledge items they draw from.
-- Exactly one target (discussion_id OR knowledge_base_item_id) must be set.
create table public.course_discussion_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_section_id uuid not null references public.course_sections(id) on delete cascade,
  discussion_id uuid references public.discussions(id) on delete cascade,
  knowledge_base_item_id uuid references public.knowledge_base_items(id) on delete cascade,
  reason text,
  score numeric check (score >= 0 and score <= 1),
  created_at timestamptz not null default now(),
  constraint course_discussion_matches_target_check check (
    discussion_id is not null or knowledge_base_item_id is not null
  )
);

create index course_discussion_matches_user_id_idx on public.course_discussion_matches (user_id);
create index course_discussion_matches_section_id_idx on public.course_discussion_matches (course_section_id);
create index course_discussion_matches_discussion_id_idx on public.course_discussion_matches (discussion_id);
create index course_discussion_matches_kb_item_id_idx on public.course_discussion_matches (knowledge_base_item_id);

create trigger course_discussion_matches_set_updated_at
  before update on public.course_discussion_matches
  for each row execute function public.set_updated_at();
