-- At most one business profile and one professional profile per account.
-- Keeps the newest row when duplicates already exist.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY poster_id, vertical
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM directory_listings
  WHERE vertical IN ('businesses', 'professionals')
    AND poster_id IS NOT NULL
)
DELETE FROM directory_listings d
USING ranked r
WHERE d.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS directory_listings_one_profile_per_vertical_idx
  ON directory_listings (poster_id, vertical)
  WHERE vertical IN ('businesses', 'professionals')
    AND poster_id IS NOT NULL;
