-- Owner “who saved” lookups: list savers for a listing without scanning by saver_id.
create index if not exists saved_listings_listing_created_idx
  on public.saved_listings (listing_kind, listing_id, created_at desc);
