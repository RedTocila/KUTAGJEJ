-- Repair columns/tables missing after re-running init.sql on a live DB.
-- Paste into Supabase Dashboard → SQL Editor → Run.
-- Safe to re-run (IF NOT EXISTS / IF EXISTS guards).

-- Premium listing windows
alter table public.real_estate_listings
  add column if not exists premium_until timestamptz;
alter table public.car_listings
  add column if not exists premium_until timestamptz;
alter table public.job_listings
  add column if not exists premium_until timestamptz;
alter table public.marketplace_listings
  add column if not exists premium_until timestamptz;
alter table public.directory_listings
  add column if not exists premium_until timestamptz;

create index if not exists real_estate_listings_premium_until_idx
  on public.real_estate_listings (premium_until desc nulls last);
create index if not exists car_listings_premium_until_idx
  on public.car_listings (premium_until desc nulls last);
create index if not exists job_listings_premium_until_idx
  on public.job_listings (premium_until desc nulls last);
create index if not exists marketplace_listings_premium_until_idx
  on public.marketplace_listings (premium_until desc nulls last);
create index if not exists directory_listings_premium_until_idx
  on public.directory_listings (premium_until desc nulls last);

create table if not exists public.premium_listing_vouchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  package_id text not null,
  days integer not null check (days > 0),
  price_eur numeric,
  price_bc integer,
  source text not null check (source in ('card', 'boost_coins', 'subscription')),
  payment_id uuid references public.payments (id) on delete set null,
  status text not null default 'unused' check (status in ('unused', 'applied', 'canceled')),
  listing_kind text,
  listing_id uuid,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing DBs may still have the old source check without 'subscription'.
alter table public.premium_listing_vouchers
  drop constraint if exists premium_listing_vouchers_source_check;
alter table public.premium_listing_vouchers
  add constraint premium_listing_vouchers_source_check
  check (source in ('card', 'boost_coins', 'subscription'));

create index if not exists premium_listing_vouchers_user_idx
  on public.premium_listing_vouchers (user_id, status);

alter table public.premium_listing_vouchers enable row level security;

-- Login streak + daily share
alter table public.profiles
  add column if not exists login_streak_days integer not null default 0
    check (login_streak_days >= 0);
alter table public.profiles
  add column if not exists login_streak_last_day date;
alter table public.profiles
  add column if not exists daily_share_claimed_on date;
alter table public.profiles
  add column if not exists avatar_url text;
alter table public.profiles
  add column if not exists auto_refresh_slots integer not null default 0
    check (auto_refresh_slots >= 0);

-- Business announcements
alter table public.directory_listings
  add column if not exists announcement_title text,
  add column if not exists announcement_subtitle text,
  add column if not exists announcement_banner_url text,
  add column if not exists announcement_at timestamptz;

-- OKAZION (idempotent)
alter table public.real_estate_listings
  add column if not exists okazion_until timestamptz;
alter table public.car_listings
  add column if not exists okazion_until timestamptz;
alter table public.job_listings
  add column if not exists okazion_until timestamptz;
alter table public.marketplace_listings
  add column if not exists okazion_until timestamptz;

create index if not exists real_estate_listings_okazion_until_idx
  on public.real_estate_listings (okazion_until desc nulls last);
create index if not exists car_listings_okazion_until_idx
  on public.car_listings (okazion_until desc nulls last);
create index if not exists job_listings_okazion_until_idx
  on public.job_listings (okazion_until desc nulls last);
create index if not exists marketplace_listings_okazion_until_idx
  on public.marketplace_listings (okazion_until desc nulls last);

-- Directory profiles never use OKAZION (drop leftover column from earlier schema).
drop index if exists public.directory_listings_okazion_until_idx;
alter table public.directory_listings
  drop column if exists okazion_until;

alter table public.contracts
  add column if not exists max_okazion_listings integer;
alter table public.user_subscriptions
  add column if not exists max_okazion_listings integer;

create table if not exists public.okazion_listing_vouchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  package_id text not null,
  days integer not null check (days > 0),
  price_eur numeric,
  price_bc integer,
  source text not null check (source in ('card', 'boost_coins', 'subscription')),
  payment_id uuid references public.payments (id) on delete set null,
  status text not null default 'unused' check (status in ('unused', 'applied', 'canceled')),
  listing_kind text,
  listing_id uuid,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists okazion_listing_vouchers_user_idx
  on public.okazion_listing_vouchers (user_id, status);

alter table public.okazion_listing_vouchers enable row level security;

-- Car vehicle type
alter table public.car_listings
  add column if not exists vehicle_type text;

-- Auto-approve defaults
alter table public.real_estate_listings alter column status set default 'approved';
alter table public.car_listings alter column status set default 'approved';
alter table public.job_listings alter column status set default 'approved';
alter table public.marketplace_listings alter column status set default 'approved';
alter table public.directory_listings alter column status set default 'approved';

-- Backfill Grow / Elite okazion quotas when column was just added as null.
update public.user_subscriptions
set max_okazion_listings = 5
where status = 'active'
  and lower(coalesce(plan_code, '')) = 'grow'
  and coalesce(max_okazion_listings, 0) = 0;

update public.user_subscriptions
set max_okazion_listings = 10
where status = 'active'
  and lower(coalesce(plan_code, '')) = 'elite'
  and coalesce(max_okazion_listings, 0) = 0;
