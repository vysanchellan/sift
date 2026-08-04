-- AI enrichment fields written by the enrichment pipeline (provider abstraction).
alter table public.discussions
  add column if not exists summary text,
  add column if not exists keywords text[] not null default '{}',
  add column if not exists category text;

-- Embeddings are stored alongside each discussion's scores. jsonb for now; a
-- pgvector migration can backfill real vector columns later for SQL-side search.
alter table public.discussion_scores
  add column if not exists embedding jsonb,
  add column if not exists embedding_model text;

-- Cheap scan for discussions awaiting enrichment (summary is the completion marker).
create index if not exists discussions_enrichment_pending_idx
  on public.discussions (user_id) where summary is null;
