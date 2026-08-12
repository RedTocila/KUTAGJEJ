-- Repair columns/tables missing after re-running init.sql on a live DB.
-- Paste into Supabase Dashboard → SQL Editor → Run.
-- Safe to re-run (IF NOT EXISTS / IF EXISTS guards).

-- Premium listing windows
alter table public.real_estate_listings
  add column if not exists premium_until timestamptz;
alter table public.car_listings
  add column if not exists premium_until timestamptz;
alter table public.job_listings
  add column if not exists premium_until timestamptz;
alter table public.marketplace_listings
  add column if not exists premium_until timestamptz;
alter table public.directory_listings
  add column if not exists premium_until timestamptz;

create index if not exists real_estate_listings_premium_until_idx
  on public.real_estate_listings (premium_until desc nulls last);
create index if not exists car_listings_premium_until_idx
  on public.car_listings (premium_until desc nulls last);
create index if not exists job_listings_premium_until_idx
  on public.job_listings (premium_until desc nulls last);
create index if not exists marketplace_listings_premium_until_idx
  on public.marketplace_listings (premium_until desc nulls last);
create index if not exists directory_listings_premium_until_idx
  on public.directory_listings (premium_until desc nulls last);

create table if not exists public.premium_listing_vouchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  package_id text not null,
  days integer not null check (days > 0),
  price_eur numeric,
  price_bc integer,
  source text not null check (source in ('card', 'boost_coins', 'subscription')),
  payment_id uuid references public.payments (id) on delete set null,
  status text not null default 'unused' check (status in ('unused', 'applied', 'canceled')),
  listing_kind text,
  listing_id uuid,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing DBs may still have the old source check without 'subscription'.
alter table public.premium_listing_vouchers
  drop constraint if exists premium_listing_vouchers_source_check;
alter table public.premium_listing_vouchers
  add constraint premium_listing_vouchers_source_check
  check (source in ('card', 'boost_coins', 'subscription'));

create index if not exists premium_listing_vouchers_user_idx
  on public.premium_listing_vouchers (user_id, status);

alter table public.premium_listing_vouchers enable row level security;

-- Login streak + daily share
alter table public.profiles
  add column if not exists login_streak_days integer not null default 0
    check (login_streak_days >= 0);
alter table public.profiles
  add column if not exists login_streak_last_day date;
alter table public.profiles
  add column if not exists daily_share_claimed_on date;
alter table public.profiles
  add column if not exists avatar_url text;
alter table public.profiles
  add column if not exists auto_refresh_slots integer not null default 0
    check (auto_refresh_slots >= 0);
alter table public.profiles
  add column if not exists based_city_id uuid
    references public.real_estate_cities (id) on delete set null;
alter table public.profiles
  add column if not exists based_city_name text;

-- Business announcements
alter table public.directory_listings
  add column if not exists announcement_title text,
  add column if not exists announcement_subtitle text,
  add column if not exists announcement_banner_url text,
  add column if not exists announcement_at timestamptz;

-- OKAZION (idempotent)
alter table public.real_estate_listings
  add column if not exists okazion_until timestamptz;
alter table public.car_listings
  add column if not exists okazion_until timestamptz;
alter table public.job_listings
  add column if not exists okazion_until timestamptz;
alter table public.marketplace_listings
  add column if not exists okazion_until timestamptz;

create index if not exists real_estate_listings_okazion_until_idx
  on public.real_estate_listings (okazion_until desc nulls last);
create index if not exists car_listings_okazion_until_idx
  on public.car_listings (okazion_until desc nulls last);
create index if not exists job_listings_okazion_until_idx
  on public.job_listings (okazion_until desc nulls last);
create index if not exists marketplace_listings_okazion_until_idx
  on public.marketplace_listings (okazion_until desc nulls last);

-- Directory profiles never use OKAZION (drop leftover column from earlier schema).
drop index if exists public.directory_listings_okazion_until_idx;
alter table public.directory_listings
  drop column if exists okazion_until;

alter table public.contracts
  add column if not exists max_okazion_listings integer;
alter table public.user_subscriptions
  add column if not exists max_okazion_listings integer;

create table if not exists public.okazion_listing_vouchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  package_id text not null,
  days integer not null check (days > 0),
  price_eur numeric,
  price_bc integer,
  source text not null check (source in ('card', 'boost_coins', 'subscription')),
  payment_id uuid references public.payments (id) on delete set null,
  status text not null default 'unused' check (status in ('unused', 'applied', 'canceled')),
  listing_kind text,
  listing_id uuid,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists okazion_listing_vouchers_user_idx
  on public.okazion_listing_vouchers (user_id, status);

alter table public.okazion_listing_vouchers enable row level security;

-- Compare-at ("was") prices for deals
alter table public.real_estate_listings
  add column if not exists original_price numeric;
alter table public.car_listings
  add column if not exists original_price numeric;
alter table public.marketplace_listings
  add column if not exists original_price numeric;

-- Chat message image attachments
alter table public.messages
  add column if not exists image_url text not null default '';

-- Per-user chat pin / hide ("delete for me")
create table if not exists public.conversation_user_state (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  pinned boolean not null default false,
  pinned_at timestamptz,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists conversation_user_state_user_idx
  on public.conversation_user_state (user_id, hidden_at);

create index if not exists conversation_user_state_user_pinned_idx
  on public.conversation_user_state (user_id, pinned, pinned_at desc nulls last)
  where pinned = true;

alter table public.conversation_user_state enable row level security;

-- Inbox read/delivered ticks need last message sender
alter table public.conversations
  add column if not exists last_message_sender_id uuid references public.profiles (id) on delete set null;

-- Direct (listing-less) member chats — contact savers / profiles with no active posts
alter table public.conversations
  alter column listing_kind drop not null;
alter table public.conversations
  alter column listing_id drop not null;
alter table public.conversations
  add column if not exists started_by text not null default 'inquirer';
create unique index if not exists conversations_direct_pair_uidx
  on public.conversations (
    least(poster_id, inquirer_id),
    greatest(poster_id, inquirer_id)
  )
  where listing_id is null;

-- Car vehicle type
alter table public.car_listings
  add column if not exists vehicle_type text;

-- Auto-approve defaults
alter table public.real_estate_listings alter column status set default 'approved';
alter table public.car_listings alter column status set default 'approved';
alter table public.job_listings alter column status set default 'approved';
alter table public.marketplace_listings alter column status set default 'approved';
alter table public.directory_listings alter column status set default 'approved';

-- Backfill Grow / Elite okazion quotas when column was just added as null.
update public.user_subscriptions
set max_okazion_listings = 5
where status = 'active'
  and lower(coalesce(plan_code, '')) = 'grow'
  and coalesce(max_okazion_listings, 0) = 0;

update public.user_subscriptions
set max_okazion_listings = 10
where status = 'active'
  and lower(coalesce(plan_code, '')) = 'elite'
  and coalesce(max_okazion_listings, 0) = 0;

-- Browse + mine performance indexes (50k+ listings)
create index if not exists real_estate_listings_status_created_at_idx
  on public.real_estate_listings (status, created_at desc);
create index if not exists car_listings_status_created_at_idx
  on public.car_listings (status, created_at desc);
create index if not exists job_listings_status_created_at_idx
  on public.job_listings (status, created_at desc);
create index if not exists marketplace_listings_status_created_at_idx
  on public.marketplace_listings (status, created_at desc);
create index if not exists directory_listings_status_created_at_idx
  on public.directory_listings (status, created_at desc);

create index if not exists real_estate_listings_status_premium_created_at_idx
  on public.real_estate_listings (status, premium_until desc nulls last, created_at desc);
create index if not exists car_listings_status_premium_created_at_idx
  on public.car_listings (status, premium_until desc nulls last, created_at desc);
create index if not exists job_listings_status_premium_created_at_idx
  on public.job_listings (status, premium_until desc nulls last, created_at desc);
create index if not exists marketplace_listings_status_premium_created_at_idx
  on public.marketplace_listings (status, premium_until desc nulls last, created_at desc);
create index if not exists directory_listings_status_premium_created_at_idx
  on public.directory_listings (status, premium_until desc nulls last, created_at desc);

create index if not exists real_estate_listings_poster_created_at_idx
  on public.real_estate_listings (poster_id, created_at desc);
create index if not exists car_listings_poster_created_at_idx
  on public.car_listings (poster_id, created_at desc);
create index if not exists job_listings_poster_created_at_idx
  on public.job_listings (poster_id, created_at desc);
create index if not exists marketplace_listings_poster_created_at_idx
  on public.marketplace_listings (poster_id, created_at desc);
create index if not exists directory_listings_poster_created_at_idx
  on public.directory_listings (poster_id, created_at desc);

-- Listing bump timestamp (refresh / premium / okazion / announce — not created_at)
alter table public.real_estate_listings
  add column if not exists bumped_at timestamptz;
alter table public.car_listings
  add column if not exists bumped_at timestamptz;
alter table public.job_listings
  add column if not exists bumped_at timestamptz;
alter table public.marketplace_listings
  add column if not exists bumped_at timestamptz;
alter table public.directory_listings
  add column if not exists bumped_at timestamptz;

update public.real_estate_listings set bumped_at = created_at where bumped_at is null;
update public.car_listings set bumped_at = created_at where bumped_at is null;
update public.job_listings set bumped_at = created_at where bumped_at is null;
update public.marketplace_listings set bumped_at = created_at where bumped_at is null;
update public.directory_listings set bumped_at = created_at where bumped_at is null;

alter table public.real_estate_listings
  alter column bumped_at set default now();
alter table public.car_listings
  alter column bumped_at set default now();
alter table public.job_listings
  alter column bumped_at set default now();
alter table public.marketplace_listings
  alter column bumped_at set default now();
alter table public.directory_listings
  alter column bumped_at set default now();

-- Only set NOT NULL when every row is backfilled (safe re-run).
do $$
begin
  if not exists (select 1 from public.real_estate_listings where bumped_at is null) then
    alter table public.real_estate_listings alter column bumped_at set not null;
  end if;
  if not exists (select 1 from public.car_listings where bumped_at is null) then
    alter table public.car_listings alter column bumped_at set not null;
  end if;
  if not exists (select 1 from public.job_listings where bumped_at is null) then
    alter table public.job_listings alter column bumped_at set not null;
  end if;
  if not exists (select 1 from public.marketplace_listings where bumped_at is null) then
    alter table public.marketplace_listings alter column bumped_at set not null;
  end if;
  if not exists (select 1 from public.directory_listings where bumped_at is null) then
    alter table public.directory_listings alter column bumped_at set not null;
  end if;
end $$;

create index if not exists real_estate_listings_bumped_at_idx
  on public.real_estate_listings (bumped_at desc);
create index if not exists car_listings_bumped_at_idx
  on public.car_listings (bumped_at desc);
create index if not exists job_listings_bumped_at_idx
  on public.job_listings (bumped_at desc);
create index if not exists marketplace_listings_bumped_at_idx
  on public.marketplace_listings (bumped_at desc);
create index if not exists directory_listings_bumped_at_idx
  on public.directory_listings (bumped_at desc);

create index if not exists real_estate_listings_status_bumped_at_idx
  on public.real_estate_listings (status, bumped_at desc);
create index if not exists car_listings_status_bumped_at_idx
  on public.car_listings (status, bumped_at desc);
create index if not exists job_listings_status_bumped_at_idx
  on public.job_listings (status, bumped_at desc);
create index if not exists marketplace_listings_status_bumped_at_idx
  on public.marketplace_listings (status, bumped_at desc);
create index if not exists directory_listings_status_bumped_at_idx
  on public.directory_listings (status, bumped_at desc);

create index if not exists real_estate_listings_status_premium_bumped_at_idx
  on public.real_estate_listings (status, premium_until desc nulls last, bumped_at desc);
create index if not exists car_listings_status_premium_bumped_at_idx
  on public.car_listings (status, premium_until desc nulls last, bumped_at desc);
create index if not exists job_listings_status_premium_bumped_at_idx
  on public.job_listings (status, premium_until desc nulls last, bumped_at desc);
create index if not exists marketplace_listings_status_premium_bumped_at_idx
  on public.marketplace_listings (status, premium_until desc nulls last, bumped_at desc);
create index if not exists directory_listings_status_premium_bumped_at_idx
  on public.directory_listings (status, premium_until desc nulls last, bumped_at desc);

-- In-app user notifications + preference toggles
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null default '',
  message text not null default '',
  ref_kind text,
  ref_id uuid,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_name text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

create index if not exists user_notifications_user_unread_idx
  on public.user_notifications (user_id)
  where read_at is null;

create table if not exists public.user_notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  messages boolean not null default true,
  listing_saved boolean not null default true,
  listing_shared boolean not null default true,
  listing_hot_lead boolean not null default true,
  listing_status boolean not null default true,
  reviews boolean not null default true,
  reservations boolean not null default true,
  verification boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_notification_preferences
  add column if not exists listing_shared boolean not null default true;

alter table public.user_notification_preferences
  add column if not exists listing_hot_lead boolean not null default true;

alter table public.user_notifications enable row level security;
alter table public.user_notification_preferences enable row level security;

-- Addon package catalogs (Premium / OKAZION / Auto-Refresh)
create table if not exists public.addon_packages (
  id text primary key,
  kind text not null check (kind in ('premium', 'okazion', 'auto-refresh')),
  days integer,
  slots integer,
  price_eur numeric not null,
  price_bc integer not null,
  label_sq text not null default '',
  label_en text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists addon_packages_kind_active_sort_idx
  on public.addon_packages (kind, active, sort_order);

alter table public.addon_packages enable row level security;

drop policy if exists "public read active addon_packages" on public.addon_packages;
create policy "public read active addon_packages"
  on public.addon_packages
  for select
  using (active = true);

-- Admin AI copilot audit log
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

create index if not exists admin_ai_actions_created_idx
  on public.admin_ai_actions (created_at desc);

create index if not exists admin_ai_actions_admin_idx
  on public.admin_ai_actions (admin_id, created_at desc);

alter table public.admin_ai_actions enable row level security;

-- Daily AI Build usage counters (free / starter limits)
create table if not exists public.ai_import_daily_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  used_on date not null,
  use_count integer not null default 0 check (use_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, used_on)
);

create index if not exists ai_import_daily_usage_day_idx
  on public.ai_import_daily_usage (used_on desc);

alter table public.ai_import_daily_usage enable row level security;

alter table public.directory_listings
  add column if not exists mobile_cta_mode text not null default 'contact'
  check (mobile_cta_mode in ('contact', 'reserve', 'none'));
