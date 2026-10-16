-- Atomic payment fulfillment claims and one-time entitlement side effects.
-- Additive only. Apply before deploying the matching backend code.

alter table public.payments
  add column if not exists fulfillment_claim text,
  add column if not exists fulfillment_claimed_at timestamptz;

alter table public.iap_processed_events
  add column if not exists status text not null default 'done',
  add column if not exists claimed_at timestamptz,
  add column if not exists claim_token text;

create table if not exists public.payment_side_effects (
  payment_id uuid not null references public.payments (id) on delete cascade,
  effect_key text not null,
  created_at timestamptz not null default now(),
  primary key (payment_id, effect_key)
);

alter table public.payment_side_effects enable row level security;

alter table public.okazion_listing_vouchers
  add column if not exists grant_ordinal integer;

create unique index if not exists user_subscriptions_payment_uidx
  on public.user_subscriptions (payment_id)
  where payment_id is not null;

create unique index if not exists premium_vouchers_payment_uidx
  on public.premium_listing_vouchers (payment_id)
  where payment_id is not null;

create unique index if not exists okazion_vouchers_payment_ordinal_uidx
  on public.okazion_listing_vouchers (payment_id, grant_ordinal)
  where payment_id is not null and grant_ordinal is not null;

create unique index if not exists payments_iap_event_uidx
  on public.payments ((metadata->>'revenueCatEventId'))
  where coalesce(metadata->>'revenueCatEventId', '') <> '';

-- One worker claims a pending payment. A stale claim can be taken over after a crash.
create or replace function public.claim_payment_fulfillment(
  p_payment_id uuid,
  p_token text,
  p_stale_seconds integer
) returns setof public.payments
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.payments
  set
    fulfillment_claim = p_token,
    fulfillment_claimed_at = now(),
    updated_at = now()
  where id = p_payment_id
    and granted = false
    and (
      fulfillment_claim is null
      or fulfillment_claimed_at is null
      or fulfillment_claimed_at < now() - make_interval(secs => greatest(coalesce(p_stale_seconds, 45), 1))
    )
  returning *;
end;
$$;

-- Insert the side-effect row and the profile counter in one transaction.
-- A unique conflict rolls back the increment so retries cannot double-credit.
create or replace function public.apply_profile_counter_once(
  p_user_id uuid,
  p_payment_id uuid,
  p_effect_key text,
  p_column text,
  p_amount numeric
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_payment_id is null or p_effect_key is null or p_effect_key = '' then
    return false;
  end if;
  if p_amount is null or p_amount = 0 then
    return false;
  end if;
  if p_column not in ('boost_credits', 'auto_refresh_slots') then
    raise exception 'unsupported profile counter';
  end if;

  insert into public.payment_side_effects (payment_id, effect_key)
  values (p_payment_id, p_effect_key);

  if p_column = 'boost_credits' then
    update public.profiles
    set
      boost_credits = round(coalesce(boost_credits, 0) + p_amount, 1),
      updated_at = now()
    where id = p_user_id;
  else
    update public.profiles
    set
      auto_refresh_slots = coalesce(auto_refresh_slots, 0) + p_amount::integer,
      updated_at = now()
    where id = p_user_id;
  end if;

  return true;
exception
  when unique_violation then
    return false;
end;
$$;

create or replace function public.claim_iap_event(
  p_event_id text,
  p_user_id uuid,
  p_product_id text,
  p_event_type text,
  p_token text,
  p_stale_seconds integer
) returns table (
  claimed boolean,
  event_id text,
  payment_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.iap_processed_events%rowtype;
  stale interval;
begin
  if p_event_id is null or p_event_id = '' or p_token is null or p_token = '' then
    return query select false, p_event_id, null::uuid, null::text;
    return;
  end if;

  stale := make_interval(secs => greatest(coalesce(p_stale_seconds, 45), 1));

  insert into public.iap_processed_events (
    event_id, user_id, product_id, event_type, status, claimed_at, claim_token
  )
  values (
    p_event_id, p_user_id, p_product_id, p_event_type, 'processing', now(), p_token
  )
  on conflict (event_id) do nothing;

  if found then
    return query select true, p_event_id, null::uuid, 'processing'::text;
    return;
  end if;

  select * into existing
  from public.iap_processed_events
  where iap_processed_events.event_id = p_event_id;

  if existing.status = 'done' then
    return query select false, existing.event_id, existing.payment_id, existing.status;
    return;
  end if;

  update public.iap_processed_events as e
  set
    claimed_at = now(),
    claim_token = p_token,
    user_id = coalesce(p_user_id, e.user_id),
    product_id = coalesce(p_product_id, e.product_id),
    event_type = coalesce(p_event_type, e.event_type)
  where e.event_id = p_event_id
    and e.status = 'processing'
    and (e.claimed_at is null or e.claimed_at < now() - stale);

  if found then
    return query select true, p_event_id, existing.payment_id, 'processing'::text;
    return;
  end if;

  return query select false, existing.event_id, existing.payment_id, existing.status;
end;
$$;

revoke all on function public.claim_payment_fulfillment(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.apply_profile_counter_once(uuid, uuid, text, text, numeric) from public, anon, authenticated;
revoke all on function public.claim_iap_event(text, uuid, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.claim_payment_fulfillment(uuid, text, integer) to service_role;
grant execute on function public.apply_profile_counter_once(uuid, uuid, text, text, numeric) to service_role;
grant execute on function public.claim_iap_event(text, uuid, text, text, text, integer) to service_role;
