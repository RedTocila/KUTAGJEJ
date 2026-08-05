-- Listings publish immediately; admins can still reject later.
alter table public.real_estate_listings alter column status set default 'approved';
alter table public.car_listings alter column status set default 'approved';
alter table public.job_listings alter column status set default 'approved';
alter table public.marketplace_listings alter column status set default 'approved';
alter table public.directory_listings alter column status set default 'approved';

-- Publish any listings still waiting on the old approval queue.
update public.real_estate_listings set status = 'approved', updated_at = now() where status = 'pending';
update public.car_listings set status = 'approved', updated_at = now() where status = 'pending';
update public.job_listings set status = 'approved', updated_at = now() where status = 'pending';
update public.marketplace_listings set status = 'approved', updated_at = now() where status = 'pending';
update public.directory_listings set status = 'approved', updated_at = now() where status = 'pending';
