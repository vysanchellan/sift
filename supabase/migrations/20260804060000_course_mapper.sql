-- Prompt 9: Course Mapper.
--
-- 1. `course_lessons`: courses → sections → lessons. Lessons hold the actual
--    teachable content; sections are the units the UI groups discussions by.
-- 2. Embeddings on `course_sections` and `course_lessons` (vector(384), the
--    local MiniLM default shared with the knowledge base). Embedding the
--    section/lesson title + description lets the course-mapper pipeline compare
--    discussions against course content with the same provider as Prompt 8.
-- 3. `course_discussion_matches` gains an optional `course_lesson_id` so a
--    match can point at the exact lesson (sections are always set) and a
--    unique (discussion_id, course_section_id) target for upserts.
-- 4. `match_course_content` RPC: nearest section/lesson to a query vector.

-- ------------------------------------------------------------- course_lessons
create table public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  section_id uuid not null references public.course_sections(id) on delete cascade,
  position integer not null default 0,
  title text not null,
  content text,
  embedding vector(384),
  embedding_provider text,
  embedding_model text,
  embedding_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_lessons_section_position_unique unique (section_id, position)
);

create index course_lessons_user_id_idx on public.course_lessons (user_id);
create index course_lessons_course_id_idx on public.course_lessons (course_id);
create index course_lessons_section_id_idx on public.course_lessons (section_id);

create trigger course_lessons_set_updated_at
  before update on public.course_lessons
  for each row execute function public.set_updated_at();

-- ------------------------------------------------- embeddings for sections
alter table public.course_sections
  add column if not exists embedding vector(384),
  add column if not exists embedding_provider text,
  add column if not exists embedding_model text,
  add column if not exists embedding_updated_at timestamptz;

-- ------------------------------------------- course_discussion_matches tweaks
-- Point a match at the exact lesson; sections remain the grouping unit.
alter table public.course_discussion_matches
  add column if not exists course_lesson_id uuid
    references public.course_lessons(id) on delete cascade;

create unique index course_discussion_matches_discussion_section_unique
  on public.course_discussion_matches (discussion_id, course_section_id)
  where discussion_id is not null;

-- ------------------------------------------------- match_course_content (RPC)
-- Nearest course section/lesson to a query vector (cosine similarity).
-- Restricted to one embedding provider so vector spaces are never mixed.
create or replace function public.match_course_content(
  p_user_id uuid,
  p_query_embedding vector,
  p_match_count int default 5,
  p_threshold float default 0.4,
  p_provider text default null
)
returns table (
  target_type text,
  course_id uuid,
  section_id uuid,
  lesson_id uuid,
  title text,
  similarity float
)
language sql stable
as $$
  select 'lesson'::text as target_type,
         l.course_id,
         l.section_id,
         l.id as lesson_id,
         l.title,
         1 - (l.embedding <=> p_query_embedding) as similarity
  from public.course_lessons l
  where l.user_id = p_user_id
    and l.embedding is not null
    and (p_provider is null or l.embedding_provider = p_provider)
    and (1 - (l.embedding <=> p_query_embedding)) >= p_threshold
  union all
  select 'section'::text as target_type,
         s.course_id,
         s.id as section_id,
         null::uuid as lesson_id,
         s.title,
         1 - (s.embedding <=> p_query_embedding) as similarity
  from public.course_sections s
  where s.user_id = p_user_id
    and s.embedding is not null
    and (p_provider is null or s.embedding_provider = p_provider)
    and (1 - (s.embedding <=> p_query_embedding)) >= p_threshold
  order by similarity desc
  limit p_match_count;
$$;

-- ------------------------------------------------------------- RLS + grants
alter table public.course_lessons enable row level security;

create policy "course_lessons_select_own" on public.course_lessons
  for select using (user_id = auth.uid());
create policy "course_lessons_insert_own" on public.course_lessons
  for insert with check (user_id = auth.uid());
create policy "course_lessons_update_own" on public.course_lessons
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "course_lessons_delete_own" on public.course_lessons
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on table public.course_lessons to authenticated;
grant all on table public.course_lessons to service_role;
grant execute on function public.match_course_content to authenticated, service_role;
