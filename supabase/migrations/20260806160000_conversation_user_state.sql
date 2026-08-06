-- Per-user chat preferences: pin to top, hide ("delete for me").

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
