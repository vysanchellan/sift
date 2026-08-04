-- Row-level security: every table is scoped to the owning authenticated user.
-- All data tables are owned by `user_id = auth.uid()`; `profiles` is scoped by id.
--
-- New Supabase projects use the "always-revoked" default, so API roles get NO
-- privileges on new tables automatically. The GRANTs at the bottom re-open them
-- to `authenticated` (subject to the policies above) and `service_role` (bypasses RLS).

-- ---------------------------------------------------------------- profiles
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_delete_own" on public.profiles
  for delete using (id = auth.uid());

-- ----------------------------------------------------------------- sources
alter table public.sources enable row level security;

create policy "sources_select_own" on public.sources
  for select using (user_id = auth.uid());
create policy "sources_insert_own" on public.sources
  for insert with check (user_id = auth.uid());
create policy "sources_update_own" on public.sources
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sources_delete_own" on public.sources
  for delete using (user_id = auth.uid());

-- ------------------------------------------------------------- discussions
alter table public.discussions enable row level security;

create policy "discussions_select_own" on public.discussions
  for select using (user_id = auth.uid());
create policy "discussions_insert_own" on public.discussions
  for insert with check (user_id = auth.uid());
create policy "discussions_update_own" on public.discussions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "discussions_delete_own" on public.discussions
  for delete using (user_id = auth.uid());

-- -------------------------------------------------------- discussion_scores
alter table public.discussion_scores enable row level security;

create policy "discussion_scores_select_own" on public.discussion_scores
  for select using (user_id = auth.uid());
create policy "discussion_scores_insert_own" on public.discussion_scores
  for insert with check (user_id = auth.uid());
create policy "discussion_scores_update_own" on public.discussion_scores
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "discussion_scores_delete_own" on public.discussion_scores
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------- clusters
alter table public.clusters enable row level security;

create policy "clusters_select_own" on public.clusters
  for select using (user_id = auth.uid());
create policy "clusters_insert_own" on public.clusters
  for insert with check (user_id = auth.uid());
create policy "clusters_update_own" on public.clusters
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "clusters_delete_own" on public.clusters
  for delete using (user_id = auth.uid());

-- ------------------------------------------------------ knowledge_base_items
alter table public.knowledge_base_items enable row level security;

create policy "knowledge_base_items_select_own" on public.knowledge_base_items
  for select using (user_id = auth.uid());
create policy "knowledge_base_items_insert_own" on public.knowledge_base_items
  for insert with check (user_id = auth.uid());
create policy "knowledge_base_items_update_own" on public.knowledge_base_items
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "knowledge_base_items_delete_own" on public.knowledge_base_items
  for delete using (user_id = auth.uid());

-- ------------------------------------------------- knowledge_base_embeddings
alter table public.knowledge_base_embeddings enable row level security;

create policy "knowledge_base_embeddings_select_own" on public.knowledge_base_embeddings
  for select using (user_id = auth.uid());
create policy "knowledge_base_embeddings_insert_own" on public.knowledge_base_embeddings
  for insert with check (user_id = auth.uid());
create policy "knowledge_base_embeddings_update_own" on public.knowledge_base_embeddings
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "knowledge_base_embeddings_delete_own" on public.knowledge_base_embeddings
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------- courses
alter table public.courses enable row level security;

create policy "courses_select_own" on public.courses
  for select using (user_id = auth.uid());
create policy "courses_insert_own" on public.courses
  for insert with check (user_id = auth.uid());
create policy "courses_update_own" on public.courses
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "courses_delete_own" on public.courses
  for delete using (user_id = auth.uid());

-- -------------------------------------------------------- course_sections
alter table public.course_sections enable row level security;

create policy "course_sections_select_own" on public.course_sections
  for select using (user_id = auth.uid());
create policy "course_sections_insert_own" on public.course_sections
  for insert with check (user_id = auth.uid());
create policy "course_sections_update_own" on public.course_sections
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "course_sections_delete_own" on public.course_sections
  for delete using (user_id = auth.uid());

-- ------------------------------------------------- course_discussion_matches
alter table public.course_discussion_matches enable row level security;

create policy "course_discussion_matches_select_own" on public.course_discussion_matches
  for select using (user_id = auth.uid());
create policy "course_discussion_matches_insert_own" on public.course_discussion_matches
  for insert with check (user_id = auth.uid());
create policy "course_discussion_matches_update_own" on public.course_discussion_matches
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "course_discussion_matches_delete_own" on public.course_discussion_matches
  for delete using (user_id = auth.uid());

-- ------------------------------------------------------------------ grants
-- Grant usage on the schema to the API roles (kept explicit to match the
-- always-revoked default on new projects).
grant usage on schema public to anon, authenticated, service_role;

-- The browser/anon-key client operates as `authenticated` once a user logs in;
-- it needs DML on the tables. `anon` (not logged in) gets nothing.
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.sources to authenticated;
grant select, insert, update, delete on table public.discussions to authenticated;
grant select, insert, update, delete on table public.discussion_scores to authenticated;
grant select, insert, update, delete on table public.clusters to authenticated;
grant select, insert, update, delete on table public.knowledge_base_items to authenticated;
grant select, insert, update, delete on table public.knowledge_base_embeddings to authenticated;
grant select, insert, update, delete on table public.courses to authenticated;
grant select, insert, update, delete on table public.course_sections to authenticated;
grant select, insert, update, delete on table public.course_discussion_matches to authenticated;

-- The service-role client (server-only admin) bypasses RLS and needs full access.
grant all on table public.profiles to service_role;
grant all on table public.sources to service_role;
grant all on table public.discussions to service_role;
grant all on table public.discussion_scores to service_role;
grant all on table public.clusters to service_role;
grant all on table public.knowledge_base_items to service_role;
grant all on table public.knowledge_base_embeddings to service_role;
grant all on table public.courses to service_role;
grant all on table public.course_sections to service_role;
grant all on table public.course_discussion_matches to service_role;
