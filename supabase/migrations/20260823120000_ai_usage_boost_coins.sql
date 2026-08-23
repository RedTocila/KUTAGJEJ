-- AI generations bill Boost Coins (0.5 / 1 BC). Store tenths of a coin.
-- Additive only: widen profiles.boost_credits; add usage ledger.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'boost_credits'
      and data_type = 'integer'
  ) then
    alter table public.profiles
      alter column boost_credits type numeric(12, 1)
      using round(boost_credits::numeric, 1);
  end if;
end $$;

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('ai_build', 'ai_assist', 'ai_menu')),
  cost_bc numeric(12, 1) not null check (cost_bc >= 0),
  units integer not null default 1 check (units >= 1),
  source_label text,
  status text not null default 'charged' check (status in ('charged', 'refunded')),
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_user_created_idx
  on public.ai_usage_events (user_id, created_at desc);

alter table public.ai_usage_events enable row level security;

create or replace function public.spend_boost_credits(p_user_id uuid, p_amount numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  next_balance numeric(12, 1);
begin
  if p_user_id is null then
    return null;
  end if;
  if p_amount is null or p_amount <= 0 then
    select boost_credits into next_balance from public.profiles where id = p_user_id;
    return next_balance;
  end if;

  update public.profiles
  set
    boost_credits = round(boost_credits - p_amount, 1),
    updated_at = now()
  where id = p_user_id
    and boost_credits >= p_amount
  returning boost_credits into next_balance;

  return next_balance;
end;
$$;

create or replace function public.credit_boost_credits(p_user_id uuid, p_amount numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  next_balance numeric(12, 1);
begin
  if p_user_id is null then
    return null;
  end if;
  if p_amount is null or p_amount <= 0 then
    select boost_credits into next_balance from public.profiles where id = p_user_id;
    return next_balance;
  end if;

  update public.profiles
  set
    boost_credits = round(boost_credits + p_amount, 1),
    updated_at = now()
  where id = p_user_id
  returning boost_credits into next_balance;

  return next_balance;
end;
$$;

revoke all on function public.spend_boost_credits(uuid, numeric) from public, anon, authenticated;
revoke all on function public.credit_boost_credits(uuid, numeric) from public, anon, authenticated;
grant execute on function public.spend_boost_credits(uuid, numeric) to service_role;
grant execute on function public.credit_boost_credits(uuid, numeric) to service_role;
