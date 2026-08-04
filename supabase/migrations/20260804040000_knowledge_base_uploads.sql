-- Prompt 8: personal knowledge base.
--
-- 1. Fix knowledge_base_embeddings to hold real document chunks: the vector
--    dimension moves to 3072 for the Gemini embedder (gemini-embedding-001),
--    the item link becomes optional, and each chunk gets `content` +
--    `chunk_index` + an optional `document_id` back-reference to the uploaded
--    file. NOTE: 20260804050000 later re-dimensions the column to 384 to make
--    the local MiniLM embedder the default; re-migrate when switching
--    providers.
-- 2. knowledge_base_documents tracks uploaded files (name, mime, storage
--    path, processing status).
-- 3. knowledge_base bucket in Storage (private, per-user folder) + policies.
-- 4. discussion_coverage stores the semantic-compare verdict for each
--    discussion (answered / partially_covered / gap).
-- 5. match_knowledge_base RPC for cosine similarity against chunk vectors.

-- ------------------------------------------------------ knowledge_base_documents
create table public.knowledge_base_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  mime_type text not null default 'text/plain',
  storage_path text not null,
  size_bytes integer not null default 0,
  status text not null default 'processing'
    check (status in ('processing', 'ready', 'failed')),
  char_count integer,
  chunk_count integer,
  embedding_provider text,
  embedding_model text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index knowledge_base_documents_user_id_idx
  on public.knowledge_base_documents (user_id);

create trigger knowledge_base_documents_set_updated_at
  before update on public.knowledge_base_documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------- knowledge_base_embeddings
-- One row per chunk. Vector dimension matches gemini-embedding-001 (3072);
-- the earlier migration's 768 was based on the non-existent text-embedding-004.
alter table public.knowledge_base_embeddings
  alter column embedding type vector(3072) using embedding::vector(3072);

-- A chunk belongs to either a distilled item or an uploaded document.
alter table public.knowledge_base_embeddings
  alter column knowledge_base_item_id drop not null;

alter table public.knowledge_base_embeddings
  add column if not exists document_id uuid
    references public.knowledge_base_documents(id) on delete cascade;

alter table public.knowledge_base_embeddings
  add column if not exists chunk_index integer not null default 0;

alter table public.knowledge_base_embeddings
  add column if not exists content text;

alter table public.knowledge_base_embeddings
  drop constraint if exists knowledge_base_embeddings_item_provider_model_unique;

create unique index knowledge_base_embeddings_document_chunk_unique
  on public.knowledge_base_embeddings (document_id, chunk_index, provider, model)
  where document_id is not null;

create unique index knowledge_base_embeddings_item_chunk_unique
  on public.knowledge_base_embeddings (knowledge_base_item_id, chunk_index, provider, model)
  where knowledge_base_item_id is not null;

-- ------------------------------------------------------------- discussion_coverage
-- Semantic-compare verdict for each discussion against the user's KB.
create table public.discussion_coverage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  status text not null check (status in ('answered', 'partially_covered', 'gap')),
  best_similarity numeric,
  best_chunk_id uuid references public.knowledge_base_embeddings(id) on delete set null,
  matched_document_id uuid references public.knowledge_base_documents(id) on delete set null,
  matched_content text,
  updated_at timestamptz not null default now(),
  constraint discussion_coverage_discussion_unique unique (discussion_id)
);

create index discussion_coverage_user_id_idx on public.discussion_coverage (user_id);

create trigger discussion_coverage_set_updated_at
  before update on public.discussion_coverage
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------- match_knowledge_base
-- Nearest KB chunk(s) to a query vector (cosine similarity). Optionally
-- restricted to one embedding provider so chunk spaces are never mixed.
create or replace function public.match_knowledge_base(
  p_user_id uuid,
  p_query_embedding vector,
  p_match_count int default 5,
  p_threshold float default 0.5,
  p_provider text default null
)
returns table (
  chunk_id uuid,
  document_id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select e.id as chunk_id,
         e.document_id,
         e.content,
         1 - (e.embedding <=> p_query_embedding) as similarity
  from public.knowledge_base_embeddings e
  where e.user_id = p_user_id
    and e.content is not null
    and (p_provider is null or e.provider = p_provider)
    and (1 - (e.embedding <=> p_query_embedding)) >= p_threshold
  order by e.embedding <=> p_query_embedding
  limit p_match_count;
$$;

-- ------------------------------------------------------------- storage bucket
-- Private bucket; each user's files live under their own user id folder.
insert into storage.buckets (id, name, public, file_size_limit)
values ('knowledge-base', 'knowledge-base', false, 26214400)
on conflict (id) do nothing;

create policy "knowledge_base_select_own" on storage.objects
  for select using (
    bucket_id = 'knowledge-base'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "knowledge_base_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'knowledge-base'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "knowledge_base_update_own" on storage.objects
  for update using (
    bucket_id = 'knowledge-base'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'knowledge-base'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "knowledge_base_delete_own" on storage.objects
  for delete using (
    bucket_id = 'knowledge-base'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------- RLS + grants
alter table public.knowledge_base_documents enable row level security;
alter table public.discussion_coverage enable row level security;

create policy "knowledge_base_documents_select_own" on public.knowledge_base_documents
  for select using (user_id = auth.uid());
create policy "knowledge_base_documents_insert_own" on public.knowledge_base_documents
  for insert with check (user_id = auth.uid());
create policy "knowledge_base_documents_update_own" on public.knowledge_base_documents
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "knowledge_base_documents_delete_own" on public.knowledge_base_documents
  for delete using (user_id = auth.uid());

create policy "discussion_coverage_select_own" on public.discussion_coverage
  for select using (user_id = auth.uid());
create policy "discussion_coverage_insert_own" on public.discussion_coverage
  for insert with check (user_id = auth.uid());
create policy "discussion_coverage_update_own" on public.discussion_coverage
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "discussion_coverage_delete_own" on public.discussion_coverage
  for delete using (user_id = auth.uid());

grant usage on schema storage to authenticated;
grant select, insert, update, delete on table storage.objects to authenticated;

grant select, insert, update, delete on table public.knowledge_base_documents to authenticated;
grant select, insert, update, delete on table public.discussion_coverage to authenticated;
grant all on table public.knowledge_base_documents to service_role;
grant all on table public.discussion_coverage to service_role;

grant execute on function public.match_knowledge_base to authenticated, service_role;
