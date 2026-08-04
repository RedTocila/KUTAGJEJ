'use client';

import * as React from 'react';
import { ListingCardLink } from '@/components/public/listing-card-link';
import { Box, Stack, Typography } from '@mui/material';
import { Bathtub as BathtubIcon } from '@phosphor-icons/react/dist/ssr/Bathtub';
import { Bed as BedIcon } from '@phosphor-icons/react/dist/ssr/Bed';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Calendar as CalendarIcon } from '@phosphor-icons/react/dist/ssr/Calendar';
import { Couch as CouchIcon } from '@phosphor-icons/react/dist/ssr/Couch';
import { House as HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { Ruler as RulerIcon } from '@phosphor-icons/react/dist/ssr/Ruler';
import { Stairs as StairsIcon } from '@phosphor-icons/react/dist/ssr/Stairs';

import { useCopy } from '@/hooks/use-copy';
import type { PublicRealEstateListing } from '@/lib/public-listings-client';
import { propertyCategoryLabel } from '@/lib/real-estate-constants';
import { listingRealEstatePublicHref } from '@/paths';

import { CardDescription } from './card-description';
import { CardMedia } from './card-media';
import { CardShell } from './card-shell';
import { formatPrice, relativeAlbanianDate } from './format-helpers';
import {
  ListingCardRating,
  resolveListingCardRating,
  type ListingCardRatingSummary,
} from './listing-card-rating';
import { SpecRow, type Spec } from './spec-row';

const FURNISHING_LABEL: Record<string, string> = {
  furnished: 'I mobiluar',
  unfurnished: 'Pa mobilim',
  'partially-furnished': 'Pjesërisht i mobiluar',
  'kitchen-only': 'Vetëm kuzhinë',
};

export function RealEstateCard({
  listing,
  sellerRating = null,
}: {
  listing: PublicRealEstateListing;
  sellerRating?: ListingCardRatingSummary | null;
}) {
  const t = useCopy();
  const location = [listing.zoneName, listing.cityName].filter(Boolean).join(', ');
  const transactionLabel = listing.transactionType === 'rent' ? t.common.forRent : t.common.forSale;
  const viewCount = listing.viewCount ?? 0;
  const cardRating = resolveListingCardRating(null, sellerRating);

  const specs: Spec[] = [
    ...(listing.bedrooms != null ? [{ Icon: BedIcon, label: `${listing.bedrooms}`, title: 'Dhoma gjumi' }] : []),
    ...(listing.bathrooms != null ? [{ Icon: BathtubIcon, label: `${listing.bathrooms}`, title: 'Banjo' }] : []),
    { Icon: RulerIcon, label: `${listing.surfaceM2} m²`, title: 'Sipërfaqe' },
    ...(listing.floor != null ? [{ Icon: StairsIcon, label: `Kati ${listing.floor}`, title: 'Kati' }] : []),
    ...(listing.yearBuilt != null
      ? [{ Icon: CalendarIcon, label: String(listing.yearBuilt), title: 'Viti i ndërtimit' }]
      : []),
    ...(listing.furnishing
      ? [{ Icon: CouchIcon, label: FURNISHING_LABEL[listing.furnishing] ?? listing.furnishing, title: 'Mobilim' }]
      : []),
  ];

  const priceLabel =
    formatPrice(listing.price, listing.currency) + (listing.transactionType === 'rent' ? ' / muaj' : '');

  const shareSpecs = [
    ...(listing.bedrooms != null ? [{ icon: 'bed' as const, label: `${listing.bedrooms}` }] : []),
    ...(listing.bathrooms != null ? [{ icon: 'bath' as const, label: `${listing.bathrooms}` }] : []),
    { icon: 'ruler' as const, label: `${listing.surfaceM2} m²` },
    ...(listing.floor != null ? [{ icon: 'stairs' as const, label: `Kati ${listing.floor}` }] : []),
    ...(listing.yearBuilt != null ? [{ icon: 'calendar' as const, label: String(listing.yearBuilt) }] : []),
    ...(listing.furnishing
      ? [{ icon: 'couch' as const, label: FURNISHING_LABEL[listing.furnishing] ?? listing.furnishing }]
      : []),
  ];

  return (
    <ListingCardLink
      listingKind="real-estate"
      listingId={listing.id}
      href={listingRealEstatePublicHref(listing)}
      style={{
        height: '100%',
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
      }}
      aria-labelledby={`listing-card-title-${listing.id}`}
    >
      <CardShell premium={Boolean(listing.isPremium)}>
        <CardMedia
          listingKind="real-estate"
          listingId={listing.id}
          imageUrl={listing.imageUrl}
          FallbackIcon={listing.propertyCategory === 'villa' ? HouseIcon : BuildingsIcon}
          alt={listing.title}
          topLeftBadge={transactionLabel}
          shareCount={listing.shareCount}
          saveCount={listing.saveCount}
          saved={listing.saved}
          premium={Boolean(listing.isPremium)}
          sharePayload={{
            title: listing.title,
            category: propertyCategoryLabel(listing.propertyCategory),
            priceLabel,
            badge: transactionLabel,
            imageUrl: listing.imageUrl,
            location: location || undefined,
            specs: shareSpecs,
            createdAt: listing.createdAt,
            viewCount,
            saveCount: listing.saveCount,
            url: listingRealEstatePublicHref(listing),
          }}
        />
        <Stack className="listing-card-body" spacing={1} sx={{ p: { xs: 1.75, sm: 2 } }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.7rem' }}
        >
          {propertyCategoryLabel(listing.propertyCategory)}
        </Typography>
        <Typography
          component="h3"
          id={`listing-card-title-${listing.id}`}
          sx={{
            fontWeight: 700,
            fontSize: '0.95rem',
            lineHeight: 1.4,
            color: 'text.primary',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {listing.title}
        </Typography>
        {cardRating ? (
          <ListingCardRating
            ratingAverage={cardRating.ratingAverage}
            reviewCount={cardRating.reviewCount}
          />
        ) : null}
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '1.1rem',
            color: listing.isPremium ? 'warning.main' : 'primary.main',
            lineHeight: 1.2,
          }}
        >
          {formatPrice(listing.price, listing.currency)}
          {listing.transactionType === 'rent' ? (
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5, fontWeight: 500 }}>
              / muaj
            </Typography>
          ) : null}
        </Typography>

        <CardDescription text={listing.description} />

        <Box sx={{ flex: 1 }} />

        <SpecRow specs={specs} />

        {location ? (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
            <MapPinIcon size={14} weight="regular" />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {location}
            </Typography>
          </Stack>
        ) : null}
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.disabled">
            {relativeAlbanianDate(listing.createdAt)}
          </Typography>
          <Stack direction="row" spacing={0.45} sx={{ alignItems: 'center', color: 'text.disabled' }}>
            <EyeIcon size={14} weight="regular" />
            <Typography variant="caption" color="text.disabled">
              {new Intl.NumberFormat('en-GB').format(viewCount)}
            </Typography>
          </Stack>
        </Stack>
        </Stack>
      </CardShell>
    </ListingCardLink>
  );
}
