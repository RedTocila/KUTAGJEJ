-- Allowlisted schema repair for Admin AI (no free-form SQL).
-- Idempotent ADD COLUMN / CREATE TABLE IF NOT EXISTS only.
-- Never DROP TABLE, TRUNCATE, or unbounded DELETE.

create or replace function public.admin_repair_missing_schema()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  create table if not exists public.referral_programs (
    id text primary key default 'default',
    page_title text not null default '',
    page_subtitle text not null default '',
    free_sign_up_title text not null default '',
    free_sign_up_subtitle text not null default '',
    free_tiers jsonb not null default '[]',
    network_builder_badge jsonb not null default '{}',
    paid_title text not null default '',
    paid_subtitle text not null default '',
    paid_tiers jsonb not null default '[]',
    revenue_driver_badge jsonb not null default '{}',
    reviews_title text not null default '',
    reviews_subtitle text not null default '',
    review_milestones jsonb not null default '[]',
    trusted_reviewer_badge jsonb not null default '{}',
    completion_title text not null default '',
    completion_subtitle text not null default '',
    platform_dominator_badge jsonb not null default '{}',
    login_streak_title text not null default '',
    login_streak_subtitle text not null default '',
    login_streak jsonb not null default '{}',
    updated_at timestamptz not null default now()
  );

  create table if not exists public.referral_signups (
    id uuid primary key default gen_random_uuid(),
    referrer_id uuid not null references public.profiles (id) on delete cascade,
    referred_user_id uuid not null unique references public.profiles (id) on delete cascade,
    kind text not null,
    credits_awarded integer not null default 0,
    referral_code_used text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  create index if not exists referral_signups_referrer_idx
    on public.referral_signups (referrer_id, created_at desc);

  create table if not exists public.admin_ai_actions (
    id uuid primary key default gen_random_uuid(),
    admin_id uuid references public.profiles (id) on delete set null,
    admin_email text not null default '',
    tool text not null,
    args jsonb not null default '{}',
    result jsonb not null default '{}',
    ok boolean not null default true,
    created_at timestamptz not null default now()
  );

  alter table public.referral_programs enable row level security;
  alter table public.referral_signups enable row level security;
  alter table public.admin_ai_actions enable row level security;

  if to_regclass('public.profiles') is not null then
    alter table public.profiles add column if not exists login_streak_days integer not null default 0;
    alter table public.profiles add column if not exists login_streak_last_day date;
    alter table public.profiles add column if not exists daily_share_claimed_on date;
    alter table public.profiles add column if not exists avatar_url text;
    alter table public.profiles add column if not exists auto_refresh_slots integer not null default 0;
    alter table public.profiles add column if not exists referral_code text;
    alter table public.profiles add column if not exists referred_by_id uuid;
    alter table public.profiles add column if not exists referral_tiers_claimed integer[] not null default '{}';
    alter table public.profiles add column if not exists boost_credits integer not null default 0;
    alter table public.profiles add column if not exists based_city_id uuid;
    alter table public.profiles add column if not exists based_city_name text;
  end if;

  if to_regclass('public.real_estate_listings') is not null then
    alter table public.real_estate_listings add column if not exists premium_until timestamptz;
    alter table public.real_estate_listings add column if not exists okazion_until timestamptz;
    alter table public.real_estate_listings add column if not exists bumped_at timestamptz;
    alter table public.real_estate_listings add column if not exists original_price numeric;
  end if;

  if to_regclass('public.car_listings') is not null then
    alter table public.car_listings add column if not exists premium_until timestamptz;
    alter table public.car_listings add column if not exists okazion_until timestamptz;
    alter table public.car_listings add column if not exists bumped_at timestamptz;
    alter table public.car_listings add column if not exists original_price numeric;
    alter table public.car_listings add column if not exists vehicle_type text;
  end if;

  if to_regclass('public.job_listings') is not null then
    alter table public.job_listings add column if not exists premium_until timestamptz;
    alter table public.job_listings add column if not exists okazion_until timestamptz;
    alter table public.job_listings add column if not exists bumped_at timestamptz;
  end if;

  if to_regclass('public.marketplace_listings') is not null then
    alter table public.marketplace_listings add column if not exists premium_until timestamptz;
    alter table public.marketplace_listings add column if not exists okazion_until timestamptz;
    alter table public.marketplace_listings add column if not exists bumped_at timestamptz;
    alter table public.marketplace_listings add column if not exists original_price numeric;
  end if;

  if to_regclass('public.directory_listings') is not null then
    alter table public.directory_listings add column if not exists premium_until timestamptz;
    alter table public.directory_listings add column if not exists bumped_at timestamptz;
    alter table public.directory_listings add column if not exists announcement_title text;
    alter table public.directory_listings add column if not exists announcement_subtitle text;
    alter table public.directory_listings add column if not exists announcement_banner_url text;
    alter table public.directory_listings add column if not exists announcement_at timestamptz;
  end if;

  if to_regclass('public.contracts') is not null then
    alter table public.contracts add column if not exists max_okazion_listings integer;
  end if;

  if to_regclass('public.user_subscriptions') is not null then
    alter table public.user_subscriptions add column if not exists max_okazion_listings integer;
  end if;

  if to_regclass('public.messages') is not null then
    alter table public.messages add column if not exists image_url text not null default '';
  end if;

  if to_regclass('public.conversations') is not null then
    alter table public.conversations add column if not exists last_message_sender_id uuid;
    alter table public.conversations add column if not exists started_by text not null default 'inquirer';
  end if;

  if to_regclass('public.user_notification_preferences') is not null then
    alter table public.user_notification_preferences add column if not exists listing_shared boolean not null default true;
    alter table public.user_notification_preferences add column if not exists listing_hot_lead boolean not null default true;
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', 'Allowlisted ADD COLUMN / CREATE TABLE IF NOT EXISTS completed.'
  );
end;
$$;

revoke all on function public.admin_repair_missing_schema() from public;
revoke all on function public.admin_repair_missing_schema() from anon, authenticated;
grant execute on function public.admin_repair_missing_schema() to service_role;
