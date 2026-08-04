-- Prompt 8 follow-up: make the local MiniLM embedder the default.
--
-- The local provider (all-MiniLM-L6-v2) is quota-free, private, and
-- deterministic, so it is the better default for bulk KB ingestion; the
-- Gemini embedder (gemini-embedding-001, 3072 dims) remains selectable via
-- KB_EMBEDDING_PROVIDER=gemini, but the column dimension must then be
-- re-migrated to match. Re-dimension the column to the local model's 384 dims.
alter table public.knowledge_base_embeddings
  alter column embedding type vector(384) using embedding::vector(384);
