-- Account verification: require ID number + front image; NIPT for business.

alter table public.professional_verification_requests
  add column if not exists id_number text not null default '',
  add column if not exists id_front_image_url text not null default '',
  add column if not exists nipt text not null default '';

alter table public.job_employer_verification_requests
  add column if not exists id_number text not null default '',
  add column if not exists id_front_image_url text not null default '',
  add column if not exists nipt text not null default '';
