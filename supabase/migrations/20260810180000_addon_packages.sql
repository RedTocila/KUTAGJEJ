-- Additive: sellable add-on catalogs (Premium / OKAZION / Auto-Refresh).
-- String ids match existing voucher package_id values (e.g. premium-15).

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
  updated_at timestamptz not null default now(),
  constraint addon_packages_days_or_slots check (
    (kind = 'auto-refresh' and slots is not null and slots > 0)
    or (kind in ('premium', 'okazion') and days is not null and days > 0)
  )
);

create index if not exists addon_packages_kind_active_sort_idx
  on public.addon_packages (kind, active, sort_order);

alter table public.addon_packages enable row level security;

drop policy if exists "public read active addon_packages" on public.addon_packages;
create policy "public read active addon_packages"
  on public.addon_packages
  for select
  using (active = true);
