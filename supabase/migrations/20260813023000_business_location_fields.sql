-- Business location: neighbourhood (zone) + optional Google Maps pin
alter table public.directory_listings
  add column if not exists zone_id uuid;

alter table public.directory_listings
  add column if not exists maps_url text;

alter table public.directory_listings
  add column if not exists location_lat double precision;

alter table public.directory_listings
  add column if not exists location_lng double precision;
