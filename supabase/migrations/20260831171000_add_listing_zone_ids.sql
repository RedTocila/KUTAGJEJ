-- Allow every location-aware listing type to store an optional zone.
-- Zones are validated against real_estate_cities.zones by the API.

alter table public.car_listings
  add column if not exists zone_id uuid;

alter table public.job_listings
  add column if not exists zone_id uuid;

alter table public.marketplace_listings
  add column if not exists zone_id uuid;

create index if not exists car_listings_zone_idx on public.car_listings (zone_id);
create index if not exists job_listings_zone_idx on public.job_listings (zone_id);
create index if not exists marketplace_listings_zone_idx on public.marketplace_listings (zone_id);
