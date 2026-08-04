-- Ordered sections within a course.
create table public.course_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  position integer not null default 0,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_sections_course_position_unique unique (course_id, position)
);

create index course_sections_user_id_idx on public.course_sections (user_id);
create index course_sections_course_id_idx on public.course_sections (course_id);

create trigger course_sections_set_updated_at
  before update on public.course_sections
  for each row execute function public.set_updated_at();
