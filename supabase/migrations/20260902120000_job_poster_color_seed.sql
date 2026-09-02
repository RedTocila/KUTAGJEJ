-- Stable hiring-poster palette index per job listing (locked on publish).
alter table public.job_listings
  add column if not exists poster_color_seed integer;

alter table public.job_listings
  drop constraint if exists job_listings_poster_color_seed_check;

alter table public.job_listings
  add constraint job_listings_poster_color_seed_check
  check (poster_color_seed is null or (poster_color_seed >= 0 and poster_color_seed < 12));
