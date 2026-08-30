-- Optional public social links shown on the member profile banner.
alter table public.profiles
  add column if not exists instagram_url text,
  add column if not exists tiktok_url text,
  add column if not exists linkedin_url text,
  add column if not exists website_url text;
