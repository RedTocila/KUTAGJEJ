-- Native app push notifications (APNs device tokens per user).
-- Additive only: safe to run on the live project.

create table if not exists public.push_device_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null default 'ios' check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_device_tokens_user_idx
  on public.push_device_tokens (user_id);

alter table public.push_device_tokens enable row level security;
