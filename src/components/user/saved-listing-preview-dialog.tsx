'use client';

import * as React from 'react';
import {
  Box,
  Stack,
  Typography,
} from '@mui/material';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';

import { ContentBlockSkeleton } from '@/components/core/content-skeletons';
import {
  ProductDialog,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { formatKilometers, formatPrice } from '@/components/public/listing-cards/format-helpers';
import { getApiUrl } from '@/lib/api-config';

export type SavedListingPreviewTarget = {
  listingKind: string;
  listingId: string;
  /** Fallback title from the notification while loading. */
  titleHint?: string;
};

type PreviewData = {
  title: string;
  imageUrl: string | null;
  priceLabel: string | null;
  location: string | null;
  meta: string | null;
};

async function fetchListing(path: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(getApiUrl(path), { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { listing?: Record<string, unknown> };
    return data.listing ?? null;
  } catch {
    return null;
  }
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function firstImage(listing: Record<string, unknown>): string | null {
  const single = str(listing.imageUrl);
  if (single) return single;
  const urls = listing.imageUrls;
  if (Array.isArray(urls) && typeof urls[0] === 'string') return urls[0];
  return null;
}

async function loadPreview(kind: string, id: string): Promise<PreviewData | null> {
  const encoded = encodeURIComponent(id);
  switch (kind) {
    case 'real-estate': {
      const listing = await fetchListing(`/public/listings/real-estate/${encoded}`);
      if (!listing) return null;
      const price = num(listing.price);
      const currency = str(listing.currency);
      const rent = listing.transactionType === 'rent';
      return {
        title: str(listing.title) || 'Njoftimi',
        imageUrl: firstImage(listing),
        priceLabel: price != null ? `${formatPrice(price, currency)}${rent ? ' / muaj' : ''}` : null,
        location: [str(listing.zoneName), str(listing.cityName)].filter(Boolean).join(', ') || null,
        meta: num(listing.surfaceM2) != null ? `${num(listing.surfaceM2)} m²` : null,
      };
    }
    case 'car': {
      const listing = await fetchListing(`/public/listings/cars/${encoded}`);
      if (!listing) return null;
      const title =
        str(listing.title) ||
        [str(listing.make), str(listing.model), str(listing.variant)].filter(Boolean).join(' ') ||
        'Njoftimi';
      const year = num(listing.year);
      const km = num(listing.kilometers);
      return {
        title,
        imageUrl: firstImage(listing),
        priceLabel: formatPrice(num(listing.price), str(listing.currency)),
        location: str(listing.cityName),
        meta: [year, km != null ? formatKilometers(km) : null].filter(Boolean).join(' · ') || null,
      };
    }
    case 'job': {
      const listing = await fetchListing(`/public/listings/jobs/${encoded}`);
      if (!listing) return null;
      const salary = num(listing.salary);
      return {
        title: str(listing.title) || 'Njoftimi',
        imageUrl: firstImage(listing),
        priceLabel:
          salary != null
            ? `${formatPrice(salary, str(listing.currency))} / muaj`
            : 'Pagë e diskutueshme',
        location: str(listing.cityName),
        meta: str(listing.jobType),
      };
    }
    case 'marketplace': {
      const listing = await fetchListing(`/public/listings/marketplace/${encoded}`);
      if (!listing) return null;
      return {
        title: str(listing.title) || 'Njoftimi',
        imageUrl: firstImage(listing),
        priceLabel: formatPrice(num(listing.price), str(listing.currency)),
        location: str(listing.cityName),
        meta: str(listing.condition),
      };
    }
    case 'businesses': {
      const listing = await fetchListing(`/public/listings/businesses/${encoded}`);
      if (!listing) return null;
      return {
        title: str(listing.title) || 'Njoftimi',
        imageUrl: firstImage(listing),
        priceLabel: null,
        location: str(listing.cityName),
        meta: str(listing.categoryLabel) || str(listing.category),
      };
    }
    case 'professionals': {
      const listing = await fetchListing(`/public/listings/professionals/${encoded}`);
      if (!listing) return null;
      return {
        title: str(listing.title) || 'Njoftimi',
        imageUrl: firstImage(listing),
        priceLabel: null,
        location: str(listing.cityName),
        meta: str(listing.categoryLabel) || str(listing.category),
      };
    }
    default:
      return null;
  }
}

/** Compact popup so owners can see which listing was saved — no full-page navigation. */
export function SavedListingPreviewDialog({
  open,
  onClose,
  target,
}: {
  open: boolean;
  onClose: () => void;
  target: SavedListingPreviewTarget | null;
}) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<PreviewData | null>(null);

  React.useEffect(() => {
    if (!open || !target?.listingId || !target.listingKind) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    void (async () => {
      try {
        const preview = await loadPreview(target.listingKind, target.listingId);
        if (cancelled) return;
        if (!preview) {
          setError('Njoftimi nuk u gjet.');
          setData(null);
        } else {
          setData(preview);
        }
      } catch {
        if (!cancelled) setError('Nuk u ngarkua njoftimi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, target?.listingId, target?.listingKind]);

  const title = data?.title || target?.titleHint || 'Njoftimi';

  return (
    <ProductDialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <ProductDialogTitle onClose={onClose}>Njoftimi i ruajtur</ProductDialogTitle>
      <ProductDialogContent>
        {loading ? (
          <ContentBlockSkeleton rows={3} rowHeight={80} />
        ) : error ? (
          <Typography color="error" variant="body2" sx={{ py: 2 }}>
            {error}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16 / 10',
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              }}
            >
              {data?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.imageUrl}
                  alt={title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : null}
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.3 }}>
              {title}
            </Typography>
            {data?.priceLabel ? (
              <Typography color="primary.main" sx={{ fontWeight: 800, fontSize: '1rem' }}>
                {data.priceLabel}
              </Typography>
            ) : null}
            {data?.meta ? (
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                {data.meta}
              </Typography>
            ) : null}
            {data?.location ? (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <MapPinIcon size={14} weight="fill" />
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {data.location}
                </Typography>
              </Stack>
            ) : null}
          </Stack>
        )}
      </ProductDialogContent>
    </ProductDialog>
  );
}
