-- Embeddings for knowledge base items, used for vector similarity search.
--
-- NOTE: the embedding dimension must match the embedding model you use.
-- Gemini text-embedding-004 produces 768 dims (the default here). If you switch
-- embedding providers, migrate this column to match their dimension.
create table public.knowledge_base_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  knowledge_base_item_id uuid not null references public.knowledge_base_items(id) on delete cascade,
  provider text not null,
  model text not null,
  embedding vector(768) not null,
  created_at timestamptz not null default now(),
  constraint knowledge_base_embeddings_item_provider_model_unique unique (knowledge_base_item_id, provider, model)
);

create index knowledge_base_embeddings_user_id_idx on public.knowledge_base_embeddings (user_id);
create index knowledge_base_embeddings_item_id_idx on public.knowledge_base_embeddings (knowledge_base_item_id);

-- Optional HNSW index for fast approximate nearest-neighbor search once you have
-- enough rows. Enable when you start doing similarity queries at scale:
-- create index knowledge_base_embeddings_hnsw_idx
--   on public.knowledge_base_embeddings using hnsw (embedding vector_cosine_ops);
