-- Daily Instagram story share reward (Boost Coins via referral activity).
alter table public.profiles
  add column if not exists daily_share_claimed_on date;
