-- RSS feeds expose neither scores nor comment counts. Make these columns
-- nullable (and drop their zero defaults) so providers can store null,
-- meaning "not provided by this source", instead of faking a 0.
alter table public.discussions
  alter column score drop not null,
  alter column num_comments drop not null,
  alter column score drop default,
  alter column num_comments drop default;
