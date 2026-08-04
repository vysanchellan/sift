-- Prompt 7: similarity clustering, trends, and transparent priority scoring.
--
-- 1. Discussion embeddings get a real pgvector column (backfilled from the
--    existing jsonb embeddings) + HNSW cosine index + a match_discussions RPC
--    for SQL-side nearest-neighbour search.
-- 2. `discussion_priority` stores the 0-100 priority score per discussion with
--    the component breakdown and a human-readable reasoning string (no black box).
-- 3. `trends` stores per-topic volume/engagement deltas over time windows so
--    rising topics can be surfaced.

-- ------------------------------------------------------------------- pgvector
-- Embeddings as a real vector column (3072 = gemini-embedding-001 dims),
-- backfilled from the jsonb embeddings written by the enrichment pipeline.
alter table public.discussion_scores
  add column if not exists embedding_vector vector(3072);

update public.discussion_scores
  set embedding_vector = embedding::text::vector
  where embedding is not null
    and embedding_vector is null;

-- Note: no HNSW/ivfflat index. Vectors are 3072-dimensional, which exceeds the
-- HNSW limit (2000) and ivfflat is not worth it at this dataset size; the
-- `<=>` scans in match_discussions / cluster_discussions run sequentially.

-- Nearest-neighbour search over a user's discussions (cosine similarity).
-- Returns the discussion ids whose vectors are closest to the query vector.
create or replace function public.match_discussions(
  p_user_id uuid,
  p_query_embedding vector(3072),
  p_match_count int default 20,
  p_threshold float default 0.6
)
returns table (
  discussion_id uuid,
  similarity float
)
language sql stable
as $$
  select s.discussion_id,
         1 - (s.embedding_vector <=> p_query_embedding) as similarity
  from public.discussion_scores s
  join public.discussions d on d.id = s.discussion_id
  where d.user_id = p_user_id
    and s.embedding_vector is not null
    and (1 - (s.embedding_vector <=> p_query_embedding)) >= p_threshold
  order by s.embedding_vector <=> p_query_embedding
  limit p_match_count;
$$;

-- ---------------------------------------------- cluster_discussions (RPC)
-- Greedy leader clustering over a user's discussion embeddings using pgvector
-- cosine similarity (`<=>`). Higher-engagement discussions become leaders; any
-- unassigned discussion within `p_threshold` cosine similarity joins that
-- cluster. Clusters with fewer than `p_min_cluster_size` members are dropped.
-- Previous clusters for the user are replaced. Returns the number of clusters.
create or replace function public.cluster_discussions(
  p_user_id uuid,
  p_threshold double precision default 0.7,
  p_min_cluster_size integer default 2
)
returns integer
language plpgsql
as $$
declare
  v_disc record;
  v_leader record;
  v_cluster_id uuid;
  v_sim double precision;
  v_found boolean;
begin
  delete from public.clusters where user_id = p_user_id;

  drop table if exists _cluster_assign;
  create temp table _cluster_assign (
    discussion_id uuid primary key,
    cluster_id uuid not null
  ) on commit drop;

  drop table if exists _cluster_leaders;
  create temp table _cluster_leaders (
    cluster_id uuid primary key,
    seed_id uuid not null,
    embedding_vector vector(3072) not null,
    member_count integer not null default 1,
    sim_sum double precision not null default 0
  ) on commit drop;

  for v_disc in
    select t.discussion_id, t.title, t.summary, t.embedding_vector,
           t.provider, t.embedding_model
    from (
      select distinct on (d.id)
        d.id as discussion_id,
        d.title,
        d.summary,
        s.embedding_vector,
        s.provider,
        s.embedding_model,
        (coalesce(d.score, 0) + coalesce(d.num_comments, 0)) as engagement
      from public.discussion_scores s
      join public.discussions d on d.id = s.discussion_id
      where d.user_id = p_user_id
        and s.embedding_vector is not null
      order by d.id, s.scored_at desc
    ) t
    order by t.engagement desc, t.discussion_id
  loop
    if exists (select 1 from _cluster_assign a where a.discussion_id = v_disc.discussion_id) then
      continue;
    end if;

    -- Nearest existing leader above the similarity threshold (fresh query per
    -- iteration so _cluster_leaders reflects assignments made so far).
    select l.cluster_id, 1 - (l.embedding_vector <=> v_disc.embedding_vector) as sim
      into v_leader
      from _cluster_leaders l
      where 1 - (l.embedding_vector <=> v_disc.embedding_vector) >= p_threshold
      order by sim desc
      limit 1;
    v_found := found;

    if v_found then
      v_cluster_id := v_leader.cluster_id;
      v_sim := v_leader.sim;

      insert into _cluster_assign values (v_disc.discussion_id, v_cluster_id);

      update _cluster_leaders
        set member_count = member_count + 1,
            sim_sum = sim_sum + v_sim
        where cluster_id = v_cluster_id;

      update public.clusters
        set discussion_ids = discussion_ids || v_disc.discussion_id,
            updated_at = now(),
            metadata = metadata || jsonb_build_object(
              'member_count', (metadata->>'member_count')::int + 1
            )
        where id = v_cluster_id;
    else
      v_cluster_id := gen_random_uuid();

      insert into _cluster_assign values (v_disc.discussion_id, v_cluster_id);

      insert into _cluster_leaders (cluster_id, seed_id, embedding_vector)
        values (v_cluster_id, v_disc.discussion_id, v_disc.embedding_vector);

      insert into public.clusters (
        id, user_id, title, summary, provider, model, discussion_ids, metadata
      ) values (
        v_cluster_id,
        p_user_id,
        v_disc.title,
        v_disc.summary,
        v_disc.provider,
        v_disc.embedding_model,
        array[v_disc.discussion_id],
        jsonb_build_object(
          'algorithm', 'greedy-leader',
          'threshold', p_threshold,
          'member_count', 1,
          'avg_similarity', 0
        )
      );
    end if;
  end loop;

  -- Finalize average similarity per cluster (avg pairwise sim of non-leaders).
  for v_leader in select * from _cluster_leaders loop
    update public.clusters
      set metadata = metadata || jsonb_build_object(
        'avg_similarity', round(
          (v_leader.sim_sum / nullif(v_leader.member_count - 1, 0))::numeric, 4
        )
      )
      where id = v_leader.cluster_id;
  end loop;

  -- Drop clusters below the minimum size (singletons / near-singletons).
  delete from public.clusters
    where user_id = p_user_id
      and (metadata->>'member_count')::int < p_min_cluster_size;

  return (select count(*)::int from public.clusters where user_id = p_user_id);
end;
$$;

-- ------------------------------------------------------- discussion_priority
-- Transparent 0-100 priority per discussion. `components` holds the normalized
-- per-factor values; `reasoning` is the human-readable "why" for the score.
create table public.discussion_priority (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  provider text not null default 'priority',
  version text not null default 'v1',
  score integer not null check (score >= 0 and score <= 100),
  components jsonb not null default '{}'::jsonb,
  reasoning text not null default '',
  scored_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discussion_priority_provider_version_unique
    unique (discussion_id, provider, version)
);

create index discussion_priority_user_score_idx
  on public.discussion_priority (user_id, score desc);
create index discussion_priority_discussion_id_idx
  on public.discussion_priority (discussion_id);

create trigger discussion_priority_set_updated_at
  before update on public.discussion_priority
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------- trends
-- Per-topic volume/engagement deltas over the previous and current windows.
create table public.trends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  volume_previous integer not null default 0,
  volume_current integer not null default 0,
  engagement_previous numeric not null default 0,
  engagement_current numeric not null default 0,
  volume_change numeric not null default 0,
  engagement_change numeric not null default 0,
  direction text not null default 'steady',
  score numeric not null default 0 check (score >= 0 and score <= 1),
  reasoning text not null default '',
  created_at timestamptz not null default now(),
  constraint trends_topic_window_unique unique (user_id, topic, window_start)
);

create index trends_user_id_idx on public.trends (user_id);

-- ------------------------------------------------------------- RLS + grants
alter table public.discussion_priority enable row level security;
alter table public.trends enable row level security;

create policy "discussion_priority_select_own" on public.discussion_priority
  for select using (user_id = auth.uid());
create policy "discussion_priority_insert_own" on public.discussion_priority
  for insert with check (user_id = auth.uid());
create policy "discussion_priority_update_own" on public.discussion_priority
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "discussion_priority_delete_own" on public.discussion_priority
  for delete using (user_id = auth.uid());

create policy "trends_select_own" on public.trends
  for select using (user_id = auth.uid());
create policy "trends_insert_own" on public.trends
  for insert with check (user_id = auth.uid());
create policy "trends_update_own" on public.trends
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "trends_delete_own" on public.trends
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on table public.discussion_priority to authenticated;
grant select, insert, update, delete on table public.trends to authenticated;
grant all on table public.discussion_priority to service_role;
grant all on table public.trends to service_role;
