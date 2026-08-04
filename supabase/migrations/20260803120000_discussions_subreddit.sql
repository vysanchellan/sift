-- Community the discussion came from (e.g. the subreddit name).
alter table public.discussions
  add column if not exists subreddit text;

create index if not exists discussions_subreddit_idx
  on public.discussions (user_id, subreddit);
