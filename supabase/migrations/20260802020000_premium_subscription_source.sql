-- Allow Premium vouchers granted by subscription plan quotas (Grow / Elite).

alter table public.premium_listing_vouchers
  drop constraint if exists premium_listing_vouchers_source_check;

alter table public.premium_listing_vouchers
  add constraint premium_listing_vouchers_source_check
  check (source in ('card', 'boost_coins', 'subscription'));
