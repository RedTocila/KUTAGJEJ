-- Per-user daily AI Build usage (free / starter limits). Service role only.

create table if not exists public.ai_import_daily_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  used_on date not null,
  use_count integer not null default 0 check (use_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, used_on)
);

create index if not exists ai_import_daily_usage_day_idx
  on public.ai_import_daily_usage (used_on desc);

alter table public.ai_import_daily_usage enable row level security;
