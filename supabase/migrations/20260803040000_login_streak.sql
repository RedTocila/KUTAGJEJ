-- Login streak tracking for daily activity rewards.
alter table public.profiles
  add column if not exists login_streak_days integer not null default 0
    check (login_streak_days >= 0);

alter table public.profiles
  add column if not exists login_streak_last_day date;
