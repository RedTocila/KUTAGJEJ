-- Street / road label from Maps pin (reverse geocode), for display line
alter table public.directory_listings
  add column if not exists location_address text;
