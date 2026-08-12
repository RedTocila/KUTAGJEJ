-- Business listing mobile primary CTA: contact | reserve | none
alter table public.directory_listings
  add column if not exists mobile_cta_mode text not null default 'contact'
  check (mobile_cta_mode in ('contact', 'reserve', 'none'));
