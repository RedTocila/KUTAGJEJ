-- Idempotency for Apple / RevenueCat purchase webhooks (additive only).
create table if not exists public.iap_processed_events (
  event_id text primary key,
  user_id uuid references public.profiles (id) on delete set null,
  product_id text,
  event_type text,
  payment_id uuid references public.payments (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists iap_processed_events_user_idx
  on public.iap_processed_events (user_id, created_at desc);

alter table public.iap_processed_events enable row level security;
