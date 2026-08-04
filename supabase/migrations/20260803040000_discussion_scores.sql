-- Per-discussion scores produced by the scoring engine (AI provider abstraction).
-- `score` is normalized 0..1; `signals` holds the per-signal breakdown for explainability.
create table public.discussion_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  provider text not null,
  model text,
  score numeric not null check (score >= 0 and score <= 1),
  confidence numeric check (confidence >= 0 and confidence <= 1),
  signals jsonb not null default '{}'::jsonb,
  rationale text,
  version text not null default 'v1',
  scored_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint discussion_scores_provider_version_unique unique (discussion_id, provider, version)
);

create index discussion_scores_user_id_idx on public.discussion_scores (user_id);
create index discussion_scores_discussion_id_idx on public.discussion_scores (discussion_id);

create trigger discussion_scores_set_updated_at
  before update on public.discussion_scores
  for each row execute function public.set_updated_at();
