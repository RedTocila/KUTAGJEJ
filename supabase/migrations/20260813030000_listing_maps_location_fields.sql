-- Exact Maps pin fields for non-directory listing tables (businesses already have these on directory_listings)
alter table public.real_estate_listings
  add column if not exists maps_url text;
alter table public.real_estate_listings
  add column if not exists location_lat double precision;
alter table public.real_estate_listings
  add column if not exists location_lng double precision;
alter table public.real_estate_listings
  add column if not exists location_address text;

alter table public.car_listings
  add column if not exists maps_url text;
alter table public.car_listings
  add column if not exists location_lat double precision;
alter table public.car_listings
  add column if not exists location_lng double precision;
alter table public.car_listings
  add column if not exists location_address text;

alter table public.job_listings
  add column if not exists maps_url text;
alter table public.job_listings
  add column if not exists location_lat double precision;
alter table public.job_listings
  add column if not exists location_lng double precision;
alter table public.job_listings
  add column if not exists location_address text;

alter table public.marketplace_listings
  add column if not exists maps_url text;
alter table public.marketplace_listings
  add column if not exists location_lat double precision;
alter table public.marketplace_listings
  add column if not exists location_lng double precision;
alter table public.marketplace_listings
  add column if not exists location_address text;
