-- Listing bump timestamp: refresh / premium / okazion / announce reorder feeds
-- without rewriting created_at (publish date, job expiry). Additive only.

alter table public.real_estate_listings
  add column if not exists bumped_at timestamptz;
alter table public.car_listings
  add column if not exists bumped_at timestamptz;
alter table public.job_listings
  add column if not exists bumped_at timestamptz;
alter table public.marketplace_listings
  add column if not exists bumped_at timestamptz;
alter table public.directory_listings
  add column if not exists bumped_at timestamptz;

update public.real_estate_listings set bumped_at = created_at where bumped_at is null;
update public.car_listings set bumped_at = created_at where bumped_at is null;
update public.job_listings set bumped_at = created_at where bumped_at is null;
update public.marketplace_listings set bumped_at = created_at where bumped_at is null;
update public.directory_listings set bumped_at = created_at where bumped_at is null;

alter table public.real_estate_listings
  alter column bumped_at set default now();
alter table public.car_listings
  alter column bumped_at set default now();
alter table public.job_listings
  alter column bumped_at set default now();
alter table public.marketplace_listings
  alter column bumped_at set default now();
alter table public.directory_listings
  alter column bumped_at set default now();

alter table public.real_estate_listings
  alter column bumped_at set not null;
alter table public.car_listings
  alter column bumped_at set not null;
alter table public.job_listings
  alter column bumped_at set not null;
alter table public.marketplace_listings
  alter column bumped_at set not null;
alter table public.directory_listings
  alter column bumped_at set not null;

create index if not exists real_estate_listings_bumped_at_idx
  on public.real_estate_listings (bumped_at desc);
create index if not exists car_listings_bumped_at_idx
  on public.car_listings (bumped_at desc);
create index if not exists job_listings_bumped_at_idx
  on public.job_listings (bumped_at desc);
create index if not exists marketplace_listings_bumped_at_idx
  on public.marketplace_listings (bumped_at desc);
create index if not exists directory_listings_bumped_at_idx
  on public.directory_listings (bumped_at desc);

-- Public browse: approved + newest by bump
create index if not exists real_estate_listings_status_bumped_at_idx
  on public.real_estate_listings (status, bumped_at desc);
create index if not exists car_listings_status_bumped_at_idx
  on public.car_listings (status, bumped_at desc);
create index if not exists job_listings_status_bumped_at_idx
  on public.job_listings (status, bumped_at desc);
create index if not exists marketplace_listings_status_bumped_at_idx
  on public.marketplace_listings (status, bumped_at desc);
create index if not exists directory_listings_status_bumped_at_idx
  on public.directory_listings (status, bumped_at desc);

create index if not exists real_estate_listings_status_premium_bumped_at_idx
  on public.real_estate_listings (status, premium_until desc nulls last, bumped_at desc);
create index if not exists car_listings_status_premium_bumped_at_idx
  on public.car_listings (status, premium_until desc nulls last, bumped_at desc);
create index if not exists job_listings_status_premium_bumped_at_idx
  on public.job_listings (status, premium_until desc nulls last, bumped_at desc);
create index if not exists marketplace_listings_status_premium_bumped_at_idx
  on public.marketplace_listings (status, premium_until desc nulls last, bumped_at desc);
create index if not exists directory_listings_status_premium_bumped_at_idx
  on public.directory_listings (status, premium_until desc nulls last, bumped_at desc);
