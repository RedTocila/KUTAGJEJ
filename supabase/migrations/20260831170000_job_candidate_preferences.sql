-- Optional candidate preferences for job listings.
-- Additive migration: existing listings remain unchanged.

alter table public.job_listings
  add column if not exists preferred_gender text;

alter table public.job_listings
  add column if not exists preferred_age_min integer;

alter table public.job_listings
  add column if not exists preferred_age_max integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.job_listings'::regclass
      and conname = 'job_listings_preferred_gender_check'
  ) then
    alter table public.job_listings
      add constraint job_listings_preferred_gender_check
      check (preferred_gender is null or preferred_gender in ('male', 'female', 'both'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.job_listings'::regclass
      and conname = 'job_listings_preferred_age_min_check'
  ) then
    alter table public.job_listings
      add constraint job_listings_preferred_age_min_check
      check (preferred_age_min is null or preferred_age_min between 18 and 65);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.job_listings'::regclass
      and conname = 'job_listings_preferred_age_max_check'
  ) then
    alter table public.job_listings
      add constraint job_listings_preferred_age_max_check
      check (preferred_age_max is null or preferred_age_max between 18 and 65);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.job_listings'::regclass
      and conname = 'job_listings_preferred_age_range_check'
  ) then
    alter table public.job_listings
      add constraint job_listings_preferred_age_range_check
      check (
        (preferred_age_min is null and preferred_age_max is null)
        or (preferred_age_min is not null and preferred_age_max is not null and preferred_age_min <= preferred_age_max)
      );
  end if;
end $$;
