-- SEO: preserve a readable slug independently from future title edits.
-- Additive/backfill-only migration; safe to apply to the live project.

DO $$
BEGIN
  -- Existing deployments already have this column, but keep the migration
  -- safe for environments created from an older schema.
  ALTER TABLE public.real_estate_listings
    ADD COLUMN IF NOT EXISTS permalink_slug text;
  ALTER TABLE public.car_listings
    ADD COLUMN IF NOT EXISTS permalink_slug text;
  ALTER TABLE public.job_listings
    ADD COLUMN IF NOT EXISTS permalink_slug text;
  ALTER TABLE public.marketplace_listings
    ADD COLUMN IF NOT EXISTS permalink_slug text;
  ALTER TABLE public.directory_listings
    ADD COLUMN IF NOT EXISTS permalink_slug text;
END
$$;

-- Keep the slug short and URL-safe while retaining Albanian letters.
UPDATE public.real_estate_listings
SET permalink_slug = left(
  trim(both '-' from regexp_replace(lower(coalesce(title, 'njoftim')), '[^[:alnum:]]+', '-', 'g')),
  80
)
WHERE coalesce(permalink_slug, '') = '';

UPDATE public.car_listings
SET permalink_slug = left(
  trim(both '-' from regexp_replace(
    lower(concat_ws(' ', make, model, nullif(variant, ''))),
    '[^[:alnum:]]+',
    '-',
    'g'
  )),
  80
)
WHERE coalesce(permalink_slug, '') = '';

UPDATE public.job_listings
SET permalink_slug = left(
  trim(both '-' from regexp_replace(lower(coalesce(title, 'njoftim')), '[^[:alnum:]]+', '-', 'g')),
  80
)
WHERE coalesce(permalink_slug, '') = '';

UPDATE public.marketplace_listings
SET permalink_slug = left(
  trim(both '-' from regexp_replace(lower(coalesce(title, 'njoftim')), '[^[:alnum:]]+', '-', 'g')),
  80
)
WHERE coalesce(permalink_slug, '') = '';

UPDATE public.directory_listings
SET permalink_slug = left(
  trim(both '-' from regexp_replace(lower(coalesce(title, 'njoftim')), '[^[:alnum:]]+', '-', 'g')),
  80
)
WHERE coalesce(permalink_slug, '') = '';

CREATE INDEX IF NOT EXISTS real_estate_listings_permalink_slug_idx
  ON public.real_estate_listings (permalink_slug);
CREATE INDEX IF NOT EXISTS car_listings_permalink_slug_idx
  ON public.car_listings (permalink_slug);
CREATE INDEX IF NOT EXISTS job_listings_permalink_slug_idx
  ON public.job_listings (permalink_slug);
CREATE INDEX IF NOT EXISTS marketplace_listings_permalink_slug_idx
  ON public.marketplace_listings (permalink_slug);
CREATE INDEX IF NOT EXISTS directory_listings_permalink_slug_idx
  ON public.directory_listings (permalink_slug);
