-- Member/profile reviews (public profile + referral Trusted badge).
create table if not exists public.member_reviews (
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

create index if not exists member_reviews_member_id_idx on public.member_reviews (member_id);
create index if not exists member_reviews_reviewer_id_idx on public.member_reviews (reviewer_id);

alter table public.member_reviews enable row level security;
