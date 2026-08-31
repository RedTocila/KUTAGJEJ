-- Let job posters choose a real cover photo or the generated hiring mockup.
-- Existing listings keep their current photo behavior.

alter table public.job_listings
  add column if not exists cover_mode text not null default 'image';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.job_listings'::regclass
      and conname = 'job_listings_cover_mode_check'
  ) then
    alter table public.job_listings
      add constraint job_listings_cover_mode_check
      check (cover_mode in ('image', 'mockup'));
  end if;
end $$;
