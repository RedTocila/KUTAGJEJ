-- Option to make profile private (hides seller card on listing cards/details and hides profile from public unless in contact).
alter table public.profiles
  add column if not exists is_private boolean not null default false;
