-- OKAZION: short-lived (5-day) featured deals — vouchers + okazion_until on listings.
-- Grow includes 5 slots, Elite includes 10. Packs sell for €5 or 100 BC.

alter table public.real_estate_listings
  add column if not exists okazion_until timestamptz;

alter table public.car_listings
  add column if not exists okazion_until timestamptz;

alter table public.job_listings
  add column if not exists okazion_until timestamptz;

alter table public.marketplace_listings
  add column if not exists okazion_until timestamptz;

alter table public.directory_listings
  add column if not exists okazion_until timestamptz;

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

create index if not exists real_estate_listings_okazion_until_idx
  on public.real_estate_listings (okazion_until desc nulls last);

create index if not exists car_listings_okazion_until_idx
  on public.car_listings (okazion_until desc nulls last);

create index if not exists job_listings_okazion_until_idx
  on public.job_listings (okazion_until desc nulls last);

create index if not exists marketplace_listings_okazion_until_idx
  on public.marketplace_listings (okazion_until desc nulls last);

create index if not exists directory_listings_okazion_until_idx
  on public.directory_listings (okazion_until desc nulls last);

alter table public.okazion_listing_vouchers enable row level security;

-- Backfill plan quotas for active Grow / Elite subscribers.
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
