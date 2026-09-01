-- Time-series view/share events for owner statistics period filters.
create table if not exists public.listing_metric_events (
  id uuid primary key default gen_random_uuid(),
  listing_kind text not null,
  listing_id uuid not null,
  event_type text not null check (event_type in ('view', 'share')),
  created_at timestamptz not null default now()
);

create index if not exists listing_metric_events_listing_created_idx
  on public.listing_metric_events (listing_kind, listing_id, created_at desc);

create index if not exists listing_metric_events_created_idx
  on public.listing_metric_events (created_at desc);

alter table public.listing_metric_events enable row level security;
