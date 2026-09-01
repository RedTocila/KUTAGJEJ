-- Free-text roles required for job listings (e.g. "Programues", "Menaxher").
-- Additive migration: existing listings remain unchanged.

alter table public.job_listings
  add column if not exists required_roles text[] not null default '{}';
