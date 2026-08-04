-- KuTaGjej fresh schema (Supabase Postgres). No Mongo migration.
-- Safe to re-run: drops existing app tables first (auth.users is kept).

create extension if not exists "pgcrypto";

-- ─── reset (idempotent re-apply) ─────────────────────────────────────────────
drop table if exists public.referral_signups cascade;
drop table if exists public.listing_metric_dedups cascade;
drop table if exists public.listing_engagements cascade;
drop table if exists public.admin_notifications cascade;
drop table if exists public.job_employer_verification_requests cascade;
drop table if exists public.professional_verification_requests cascade;
drop table if exists public.user_subscriptions cascade;
drop table if exists public.payments cascade;
drop table if exists public.saved_listings cascade;
drop table if exists public.professional_listing_reviews cascade;
drop table if exists public.business_listing_reviews cascade;
drop table if exists public.member_reviews cascade;
drop table if exists public.business_reservations cascade;
drop table if exists public.messages cascade;
drop table if exists public.conversations cascade;
drop table if exists public.directory_listings cascade;
drop table if exists public.marketplace_listings cascade;
drop table if exists public.job_listings cascade;
drop table if exists public.car_listings cascade;
drop table if exists public.real_estate_listings cascade;
drop table if exists public.referral_programs cascade;
drop table if exists public.home_banners cascade;
drop table if exists public.credit_packages cascade;
drop table if exists public.contracts cascade;
drop table if exists public.real_estate_cities cascade;
drop table if exists public.listing_categories cascade;
drop table if exists public.profiles cascade;
drop table if exists public.roles cascade;

-- ─── profiles (auth.users) ───────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  account_type text not null check (account_type in ('admin', 'managed', 'individual', 'business')),
  role text not null default '',
  role_id uuid,
  is_active boolean not null default true,
  nipt text unique,
  business_name text,
  business_owner text,
  business_category text,
  created_by uuid references public.profiles (id) on delete set null,
  jobs_employer_verified_at timestamptz,
  professionals_verified_at timestamptz,
  referral_code text unique,
  referred_by_id uuid references public.profiles (id) on delete set null,
  boost_credits integer not null default 0 check (boost_credits >= 0),
  auto_refresh_slots integer not null default 0 check (auto_refresh_slots >= 0),
  referral_tiers_claimed integer[] not null default '{}',
  avatar_url text,
  last_login timestamptz,
  last_active timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_account_type_idx on public.profiles (account_type);
create index profiles_referred_by_id_idx on public.profiles (referred_by_id);

-- ─── roles ───────────────────────────────────────────────────────────────────
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_role_id_fkey foreign key (role_id) references public.roles (id) on delete set null;

-- ─── catalog ─────────────────────────────────────────────────────────────────
create table public.listing_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  slug text not null unique,
  listing_types jsonb not null default '[]',
  apartment_types jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table public.real_estate_cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  zones jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  content text not null default '',
  plan_code text,
  sort_order integer not null default 0,
  listing_category_key text,
  subscriber_kind text,
  refresh_every_hours integer,
  glow_badge_enabled boolean not null default false,
  boost_credits integer not null default 0,
  daily_boost_access boolean not null default false,
  max_list_all_categories integer,
  max_job_listings integer,
  max_car_listings integer,
  max_apartment_listings integer,
  max_product_listings integer,
  max_premium_listings integer,
  price_1_month numeric,
  price_3_months numeric,
  price_6_months numeric,
  price_12_months numeric,
  role_ids uuid[] not null default '{}',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contracts_plan_code_idx on public.contracts (plan_code);

create table public.credit_packages (
  id uuid primary key default gen_random_uuid(),
  credits integer not null,
  bonus_credits integer not null default 0,
  price_eur numeric not null,
  label_sq text not null default '',
  badge_sq text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index credit_packages_active_sort_idx on public.credit_packages (active, sort_order);

create table public.home_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  subtitle text not null default '',
  image_url text not null default '',
  cta_label text not null default '',
  cta_href text not null default '',
  "order" integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.referral_programs (
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

-- ─── listings (shared moderation columns) ────────────────────────────────────
create table public.real_estate_listings (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.profiles (id) on delete cascade,
  property_category text,
  title text not null default '',
  description text not null default '',
  transaction_type text,
  price numeric,
  currency text not null default 'EUR',
  surface_m2 numeric,
  city_id uuid references public.real_estate_cities (id) on delete set null,
  zone_id uuid,
  contact_phone text not null default '',
  condition text,
  apartment_type_slug text,
  floor integer,
  total_floors integer,
  parking_floor integer,
  bedrooms integer,
  bathrooms integer,
  year_built integer,
  furnishing text,
  image_urls text[] not null default '{}',
  permalink_slug text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index real_estate_listings_poster_idx on public.real_estate_listings (poster_id);
create index real_estate_listings_status_idx on public.real_estate_listings (status);

create table public.car_listings (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.profiles (id) on delete cascade,
  make text not null default '',
  model text not null default '',
  variant text not null default '',
  description text not null default '',
  year integer,
  kilometers integer,
  transmission text,
  fuel_type text,
  price numeric,
  currency text not null default 'EUR',
  color text,
  finish text[] not null default '{}',
  extras text[] not null default '{}',
  contact_phone text not null default '',
  city_id uuid references public.real_estate_cities (id) on delete set null,
  image_urls text[] not null default '{}',
  permalink_slug text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index car_listings_poster_idx on public.car_listings (poster_id);
create index car_listings_status_idx on public.car_listings (status);

create table public.job_listings (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default '',
  description text not null default '',
  industry text,
  education text,
  experience text,
  job_type text,
  city_id uuid references public.real_estate_cities (id) on delete set null,
  work_location text,
  salary numeric,
  currency text not null default 'EUR',
  contact_phone text not null default '',
  image_urls text[] not null default '{}',
  responsibilities text[] not null default '{}',
  requirements text[] not null default '{}',
  benefits jsonb not null default '[]',
  permalink_slug text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index job_listings_poster_idx on public.job_listings (poster_id);
create index job_listings_status_idx on public.job_listings (status);

create table public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.profiles (id) on delete cascade,
  transaction_type text,
  title text not null default '',
  description text not null default '',
  category text,
  condition text,
  price numeric,
  currency text not null default 'EUR',
  city_id uuid references public.real_estate_cities (id) on delete set null,
  contact_phone text not null default '',
  image_urls text[] not null default '{}',
  permalink_slug text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index marketplace_listings_poster_idx on public.marketplace_listings (poster_id);
create index marketplace_listings_status_idx on public.marketplace_listings (status);

create table public.directory_listings (
  id uuid primary key default gen_random_uuid(),
  vertical text not null check (vertical in ('businesses', 'professionals')),
  poster_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default '',
  description text not null default '',
  category text,
  condition text,
  price numeric,
  currency text not null default 'EUR',
  opening_hours text,
  weekly_hours jsonb not null default '{}',
  menu_categories jsonb not null default '[]',
  menu_items jsonb not null default '[]',
  reservations_enabled boolean not null default false,
  reservation_url text,
  reservation_time_slots text[] not null default '{}',
  reservation_party_sizes integer[] not null default '{}',
  services_highlight text,
  response_time_hours integer,
  portfolio_items jsonb not null default '[]',
  city_id uuid references public.real_estate_cities (id) on delete set null,
  contact_phone text not null default '',
  image_urls text[] not null default '{}',
  permalink_slug text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index directory_listings_vertical_idx on public.directory_listings (vertical);
create index directory_listings_poster_idx on public.directory_listings (poster_id);
create index directory_listings_status_idx on public.directory_listings (status);

-- ─── messaging ───────────────────────────────────────────────────────────────
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_kind text not null,
  listing_id uuid not null,
  listing_title text not null default '',
  listing_image_url text not null default '',
  poster_id uuid not null references public.profiles (id) on delete cascade,
  inquirer_id uuid not null references public.profiles (id) on delete cascade,
  last_message_text text not null default '',
  last_message_at timestamptz,
  poster_unread_count integer not null default 0,
  inquirer_unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_kind, listing_id, inquirer_id)
);
create index conversations_poster_idx on public.conversations (poster_id, last_message_at desc nulls last);
create index conversations_inquirer_idx on public.conversations (inquirer_id, last_message_at desc nulls last);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);

-- ─── reviews / reservations / saved ──────────────────────────────────────────
create table public.business_reservations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.directory_listings (id) on delete cascade,
  guest_name text not null default '',
  guest_phone text not null default '',
  party_size integer not null default 1,
  reservation_date text not null default '',
  time_slot text not null default '',
  status text not null default 'pending',
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_listing_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.directory_listings (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, reviewer_id)
);

create table public.professional_listing_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.directory_listings (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, reviewer_id)
);

create table public.member_reviews (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, reviewer_id),
  check (member_id <> reviewer_id)
);

create table public.saved_listings (
  id uuid primary key default gen_random_uuid(),
  saver_id uuid not null references public.profiles (id) on delete cascade,
  listing_kind text not null,
  listing_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (saver_id, listing_kind, listing_id)
);

create table public.listing_auto_refresh (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_kind text not null,
  listing_id uuid not null,
  enabled boolean not null default true,
  last_refreshed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, listing_kind, listing_id)
);
create index listing_auto_refresh_user_idx on public.listing_auto_refresh (user_id);
create index listing_auto_refresh_due_idx on public.listing_auto_refresh (enabled, last_refreshed_at);

-- ─── billing ─────────────────────────────────────────────────────────────────
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  payer_id uuid references public.profiles (id) on delete set null,
  payer_email text not null default '',
  payer_name text not null default '',
  type text not null,
  description text not null default '',
  amount_minor integer,
  amount numeric,
  currency text not null default 'EUR',
  pok_env text,
  pok_order_id text,
  pok_status text,
  status text not null default 'pending',
  granted boolean not null default false,
  metadata jsonb not null default '{}',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_payer_idx on public.payments (payer_id);
create index payments_pok_order_idx on public.payments (pok_order_id);
create index payments_created_idx on public.payments (created_at desc);

create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  contract_id uuid references public.contracts (id) on delete set null,
  contract_title text not null default '',
  listing_category_key text,
  subscriber_kind text,
  months integer,
  price_eur numeric,
  refresh_every_hours integer,
  glow_badge_enabled boolean not null default false,
  boost_credits_granted integer not null default 0,
  daily_boost_access boolean not null default false,
  plan_code text,
  max_list_all_categories integer,
  max_job_listings integer,
  max_car_listings integer,
  max_apartment_listings integer,
  max_product_listings integer,
  max_premium_listings integer,
  starts_at timestamptz,
  expires_at timestamptz,
  status text not null default 'active',
  payment_id uuid references public.payments (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index user_subscriptions_user_idx on public.user_subscriptions (user_id);
create index user_subscriptions_expires_idx on public.user_subscriptions (expires_at);

-- ─── verification / admin ────────────────────────────────────────────────────
create table public.professional_verification_requests (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  message text not null default '',
  admin_note text not null default '',
  applicant_snapshot jsonb not null default '{}',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_employer_verification_requests (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  message text not null default '',
  admin_note text not null default '',
  applicant_snapshot jsonb not null default '{}',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  ref_kind text,
  ref_id uuid,
  title text not null default '',
  message text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index admin_notifications_created_idx on public.admin_notifications (created_at desc);

-- ─── metrics / referrals ─────────────────────────────────────────────────────
create table public.listing_engagements (
  id uuid primary key default gen_random_uuid(),
  listing_kind text not null,
  listing_id uuid not null,
  view_count integer not null default 0,
  click_count integer not null default 0,
  share_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_kind, listing_id)
);

create table public.listing_metric_dedups (
  id uuid primary key default gen_random_uuid(),
  listing_kind text not null,
  listing_id uuid not null,
  visitor_key text not null,
  event_type text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_kind, listing_id, visitor_key, event_type)
);

create table public.referral_signups (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  referred_user_id uuid not null unique references public.profiles (id) on delete cascade,
  kind text not null,
  credits_awarded integer not null default 0,
  referral_code_used text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index referral_signups_referrer_idx on public.referral_signups (referrer_id, created_at desc);

-- ─── RLS (service role bypasses; anon/authenticated locked down by default) ──
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.listing_categories enable row level security;
alter table public.real_estate_cities enable row level security;
alter table public.contracts enable row level security;
alter table public.credit_packages enable row level security;
alter table public.home_banners enable row level security;
alter table public.referral_programs enable row level security;
alter table public.real_estate_listings enable row level security;
alter table public.car_listings enable row level security;
alter table public.job_listings enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.directory_listings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.business_reservations enable row level security;
alter table public.business_listing_reviews enable row level security;
alter table public.professional_listing_reviews enable row level security;
alter table public.member_reviews enable row level security;
alter table public.saved_listings enable row level security;
alter table public.listing_auto_refresh enable row level security;
alter table public.payments enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.professional_verification_requests enable row level security;
alter table public.job_employer_verification_requests enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.listing_engagements enable row level security;
alter table public.listing_metric_dedups enable row level security;
alter table public.referral_signups enable row level security;

-- Public read of approved listings / active banners / categories (anon)
create policy "public read listing_categories" on public.listing_categories for select using (true);
create policy "public read real_estate_cities" on public.real_estate_cities for select using (true);
create policy "public read active home_banners" on public.home_banners for select using (is_active = true);
create policy "public read approved real_estate" on public.real_estate_listings for select using (status = 'approved');
create policy "public read approved cars" on public.car_listings for select using (status = 'approved');
create policy "public read approved jobs" on public.job_listings for select using (status = 'approved');
create policy "public read approved marketplace" on public.marketplace_listings for select using (status = 'approved');
create policy "public read approved directory" on public.directory_listings for select using (status = 'approved');
create policy "public read active credit_packages" on public.credit_packages for select using (active = true);
create policy "public read contracts" on public.contracts for select using (true);
create policy "public read referral_programs" on public.referral_programs for select using (true);
create policy "users read own profile" on public.profiles for select using (auth.uid() = id);

-- Create storage bucket `listings` (public) in the Supabase dashboard if needed.
