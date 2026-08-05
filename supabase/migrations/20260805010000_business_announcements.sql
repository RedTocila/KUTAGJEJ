-- Business listing announcements (promo stripe on media cards).
-- Creating/re-announcing costs Boost Coins and bumps the listing to the top.

alter table public.directory_listings
  add column if not exists announcement_title text,
  add column if not exists announcement_subtitle text,
  add column if not exists announcement_banner_url text,
  add column if not exists announcement_at timestamptz;

comment on column public.directory_listings.announcement_title is
  'Active when non-empty; shown as promo headline on business cards/detail.';
comment on column public.directory_listings.announcement_subtitle is
  'Optional supporting line under the announcement title.';
comment on column public.directory_listings.announcement_banner_url is
  'Optional banner image URL for the announcement detail card.';
comment on column public.directory_listings.announcement_at is
  'Last time the announcement was published or re-announced (with Boost Coin charge).';
