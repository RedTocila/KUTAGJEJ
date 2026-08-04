-- Premium listing add-on: vouchers + premium_until on listings.

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

create table if not exists public.premium_listing_vouchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  package_id text not null,
  days integer not null check (days > 0),
  price_eur numeric,
  price_bc integer,
  source text not null check (source in ('card', 'boost_coins')),
  payment_id uuid references public.payments (id) on delete set null,
  status text not null default 'unused' check (status in ('unused', 'applied', 'canceled')),
  listing_kind text,
  listing_id uuid,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists premium_listing_vouchers_user_idx
  on public.premium_listing_vouchers (user_id, status);

alter table public.premium_listing_vouchers enable row level security;
