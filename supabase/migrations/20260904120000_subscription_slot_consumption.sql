-- Period-based package slot consumption: used stays until the next subscription
-- row (renew / repurchase). Listings are not deleted on refresh.

alter table public.user_subscriptions
  add column if not exists used_job_listings integer not null default 0,
  add column if not exists used_car_listings integer not null default 0,
  add column if not exists used_apartment_listings integer not null default 0,
  add column if not exists used_product_listings integer not null default 0,
  add column if not exists used_premium_listings integer not null default 0,
  add column if not exists used_okazion_listings integer not null default 0;

alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_used_job_listings_check;
alter table public.user_subscriptions
  add constraint user_subscriptions_used_job_listings_check check (used_job_listings >= 0);

alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_used_car_listings_check;
alter table public.user_subscriptions
  add constraint user_subscriptions_used_car_listings_check check (used_car_listings >= 0);

alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_used_apartment_listings_check;
alter table public.user_subscriptions
  add constraint user_subscriptions_used_apartment_listings_check check (used_apartment_listings >= 0);

alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_used_product_listings_check;
alter table public.user_subscriptions
  add constraint user_subscriptions_used_product_listings_check check (used_product_listings >= 0);

alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_used_premium_listings_check;
alter table public.user_subscriptions
  add constraint user_subscriptions_used_premium_listings_check check (used_premium_listings >= 0);

alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_used_okazion_listings_check;
alter table public.user_subscriptions
  add constraint user_subscriptions_used_okazion_listings_check check (used_okazion_listings >= 0);

-- Best-effort seed for in-flight paid plans (preserve current dashboard numbers).
update public.user_subscriptions us
set
  used_car_listings = least(
    coalesce(us.max_car_listings, 0),
    (select count(*)::integer from public.car_listings c where c.poster_id = us.user_id)
  ),
  used_product_listings = least(
    coalesce(us.max_product_listings, 0),
    (select count(*)::integer from public.marketplace_listings m where m.poster_id = us.user_id)
  ),
  used_apartment_listings = least(
    coalesce(us.max_apartment_listings, 0),
    (select count(*)::integer from public.real_estate_listings r where r.poster_id = us.user_id)
  ),
  used_job_listings = least(
    coalesce(us.max_job_listings, 0),
    (select count(*)::integer from public.job_listings j where j.poster_id = us.user_id)
  ),
  used_premium_listings = least(
    coalesce(us.max_premium_listings, 0),
    (
      select count(*)::integer
      from public.premium_listing_vouchers v
      where v.user_id = us.user_id
        and v.source = 'subscription'
        and v.status = 'applied'
        and (us.starts_at is null or v.applied_at >= us.starts_at)
        and (us.expires_at is null or v.applied_at <= us.expires_at)
    )
  ),
  used_okazion_listings = least(
    coalesce(us.max_okazion_listings, 0),
    (
      select count(*)::integer
      from public.okazion_listing_vouchers v
      where v.user_id = us.user_id
        and v.source = 'subscription'
        and v.status = 'applied'
        and (us.starts_at is null or v.applied_at >= us.starts_at)
        and (us.expires_at is null or v.applied_at <= us.expires_at)
    )
  ),
  updated_at = now()
where us.status = 'active'
  and coalesce(us.price_eur, 0) > 0
  and coalesce(us.used_car_listings, 0) = 0
  and coalesce(us.used_product_listings, 0) = 0
  and coalesce(us.used_apartment_listings, 0) = 0
  and coalesce(us.used_job_listings, 0) = 0
  and coalesce(us.used_premium_listings, 0) = 0
  and coalesce(us.used_okazion_listings, 0) = 0;
