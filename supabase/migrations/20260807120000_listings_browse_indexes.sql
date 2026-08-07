-- Browse + mine performance indexes for large listing tables (additive only).
-- Safe to re-run (IF NOT EXISTS).

-- Public browse: filter approved + sort by created_at
create index if not exists real_estate_listings_status_created_at_idx
  on public.real_estate_listings (status, created_at desc);
create index if not exists car_listings_status_created_at_idx
  on public.car_listings (status, created_at desc);
create index if not exists job_listings_status_created_at_idx
  on public.job_listings (status, created_at desc);
create index if not exists marketplace_listings_status_created_at_idx
  on public.marketplace_listings (status, created_at desc);
create index if not exists directory_listings_status_created_at_idx
  on public.directory_listings (status, created_at desc);

-- Public browse default sort: premium first, then created_at
create index if not exists real_estate_listings_status_premium_created_at_idx
  on public.real_estate_listings (status, premium_until desc nulls last, created_at desc);
create index if not exists car_listings_status_premium_created_at_idx
  on public.car_listings (status, premium_until desc nulls last, created_at desc);
create index if not exists job_listings_status_premium_created_at_idx
  on public.job_listings (status, premium_until desc nulls last, created_at desc);
create index if not exists marketplace_listings_status_premium_created_at_idx
  on public.marketplace_listings (status, premium_until desc nulls last, created_at desc);
create index if not exists directory_listings_status_premium_created_at_idx
  on public.directory_listings (status, premium_until desc nulls last, created_at desc);

-- Mine / owner inventory: poster + newest first
create index if not exists real_estate_listings_poster_created_at_idx
  on public.real_estate_listings (poster_id, created_at desc);
create index if not exists car_listings_poster_created_at_idx
  on public.car_listings (poster_id, created_at desc);
create index if not exists job_listings_poster_created_at_idx
  on public.job_listings (poster_id, created_at desc);
create index if not exists marketplace_listings_poster_created_at_idx
  on public.marketplace_listings (poster_id, created_at desc);
create index if not exists directory_listings_poster_created_at_idx
  on public.directory_listings (poster_id, created_at desc);
