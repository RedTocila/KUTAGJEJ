-- OKAZION is only for sellable ads (real estate, cars, jobs, marketplace).
-- Directory profiles (businesses / professionals) never use it.

drop index if exists public.directory_listings_okazion_until_idx;

alter table public.directory_listings
  drop column if exists okazion_until;
