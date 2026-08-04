-- Auto-refresh add-on: purchased slot capacity + enrolled listings.

alter table public.profiles
  add column if not exists auto_refresh_slots integer not null default 0
    check (auto_refresh_slots >= 0);

create table if not exists public.listing_auto_refresh (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_kind text not null,
  listing_id uuid not null,
  enabled boolean not null default true,
  last_refreshed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, listing_kind, listing_id)
);

create index if not exists listing_auto_refresh_user_idx
  on public.listing_auto_refresh (user_id);

create index if not exists listing_auto_refresh_due_idx
  on public.listing_auto_refresh (enabled, last_refreshed_at);

alter table public.listing_auto_refresh enable row level security;
