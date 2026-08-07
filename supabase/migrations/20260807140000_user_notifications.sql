-- In-app user notifications + per-event preference toggles.

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null default '',
  message text not null default '',
  ref_kind text,
  ref_id uuid,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_name text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

create index if not exists user_notifications_user_unread_idx
  on public.user_notifications (user_id)
  where read_at is null;

create table if not exists public.user_notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  messages boolean not null default true,
  listing_saved boolean not null default true,
  listing_status boolean not null default true,
  reviews boolean not null default true,
  reservations boolean not null default true,
  verification boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_notifications enable row level security;
alter table public.user_notification_preferences enable row level security;
