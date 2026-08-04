-- Profile avatars for portal users (individual / business).
alter table public.profiles
  add column if not exists avatar_url text;
