-- Backfills `embedding_vector` from the jsonb `embedding` column. Idempotent;
-- call after enrichment writes new jsonb embeddings to keep the vector column
-- in sync for pgvector similarity operations.
create or replace function public.sync_embedding_vectors()
returns void
language sql
as $$
  update public.discussion_scores
    set embedding_vector = embedding::text::vector
    where embedding is not null
      and embedding_vector is null;
$$;

grant execute on function public.sync_embedding_vectors() to service_role;
