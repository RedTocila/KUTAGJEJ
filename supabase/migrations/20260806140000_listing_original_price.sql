-- Optional compare-at ("was") price for deal-style listings.
-- Current price/salary stays the live amount; original_* is shown strikethrough when higher.

alter table public.real_estate_listings
  add column if not exists original_price numeric;

alter table public.car_listings
  add column if not exists original_price numeric;

alter table public.marketplace_listings
  add column if not exists original_price numeric;
