-- Audit log for the admin AI copilot. Service role only (no public policies).

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
