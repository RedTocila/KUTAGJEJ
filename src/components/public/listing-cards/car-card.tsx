'use client';

import * as React from 'react';
import { ListingCardLink } from '@/components/public/listing-card-link';
import { Box, Stack, Typography } from '@mui/material';
import { Calendar as CalendarIcon } from '@phosphor-icons/react/dist/ssr/Calendar';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { GasPump as GasPumpIcon } from '@phosphor-icons/react/dist/ssr/GasPump';
import { Gauge as GaugeIcon } from '@phosphor-icons/react/dist/ssr/Gauge';
import { GearSix as GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { PaintBucket as PaintBucketIcon } from '@phosphor-icons/react/dist/ssr/PaintBucket';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';

import { CAR_COLOUR_OPTIONS, FUEL_TYPE_OPTIONS, TRANSMISSION_OPTIONS, vehicleTypeLabel } from '@/lib/car-constants';
import type { PublicCarListing } from '@/lib/public-listings-client';
import { listingCarPublicHref } from '@/paths';

import { CardDescription } from './card-description';
import { CardMedia } from './card-media';
import { CardShell } from './card-shell';
import { findOptionLabel, formatKilometers, formatPrice, listingCardRelativeDate } from './format-helpers';
import { ListingPrice } from './listing-price';
import { ListingTitleWithVerified } from './listing-title-with-verified';
import {
  ListingCardRating,
  resolveListingCardRating,
  type ListingCardRatingSummary,
} from './listing-card-rating';
import { SpecRow, type Spec } from './spec-row';

export function CarCard({
  listing,
  sellerRating = null,
  imagePriority = false,
}: {
  listing: PublicCarListing;
  sellerRating?: ListingCardRatingSummary | null;
  imagePriority?: boolean;
}) {
  const title = [listing.make, listing.model, listing.variant].filter(Boolean).join(' ');
  const viewCount = listing.viewCount ?? 0;
  const typeLabel = listing.vehicleType ? vehicleTypeLabel(listing.vehicleType) : null;
  const fuelLabel = findOptionLabel(FUEL_TYPE_OPTIONS, listing.fuelType);
  const transmissionLabel = findOptionLabel(TRANSMISSION_OPTIONS, listing.transmission);
  const colourLabel = findOptionLabel(CAR_COLOUR_OPTIONS, listing.color);
  const cardRating = resolveListingCardRating(null, sellerRating);

  const specs: Spec[] = [
    { Icon: CalendarIcon, label: String(listing.year), title: 'Viti' },
    { Icon: GaugeIcon, label: formatKilometers(listing.kilometers), title: 'Kilometrazh' },
    { Icon: GasPumpIcon, label: fuelLabel, title: 'Karburant' },
    { Icon: GearSixIcon, label: transmissionLabel, title: 'Transmision' },
    ...(listing.color ? [{ Icon: PaintBucketIcon, label: colourLabel, title: 'Ngjyra' }] : []),
  ];

  return (
    <ListingCardLink
      listingKind="car"
      listingId={listing.id}
      href={listingCarPublicHref(listing)}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
    >
    <CardShell premium={Boolean(listing.isPremium)} okazion={Boolean(listing.isOkazion)}>
      <CardMedia
        listingKind="car"
        listingId={listing.id}
        imageUrl={listing.imageUrl}
        FallbackIcon={CarIcon}
        alt={title}
        topLeftBadge={`${listing.year}`}
        shareCount={listing.shareCount}
        saveCount={listing.saveCount}
        saved={listing.saved}
        premium={Boolean(listing.isPremium)}
        okazion={Boolean(listing.isOkazion)}
        okazionUntil={listing.okazionUntil}
        priority={imagePriority}
        sharePayload={{
          title,
          category: listing.make,
          priceLabel: formatPrice(listing.price, listing.currency),
          badge: String(listing.year),
          imageUrl: listing.imageUrl,
          location: listing.cityName || undefined,
          specs: [
            { icon: 'calendar', label: String(listing.year) },
            { icon: 'gauge', label: formatKilometers(listing.kilometers) },
            { icon: 'gas', label: fuelLabel },
            { icon: 'gear', label: transmissionLabel },
            ...(listing.color ? [{ icon: 'paint' as const, label: colourLabel }] : []),
          ],
          createdAt: listing.createdAt,
          viewCount,
          saveCount: listing.saveCount,
          url: listingCarPublicHref(listing),
        }}
      />
      <Stack className="listing-card-body" spacing={1} sx={{ p: { xs: 1.75, sm: 2 } }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.7rem' }}
        >
          {typeLabel ? `${typeLabel} · ${listing.make}` : listing.make}
        </Typography>
        <ListingTitleWithVerified
          title={title}
          verified={Boolean(listing.sellerVerified)}
          trustBadge={Boolean(listing.sellerTrustBadge)}
        />
        {cardRating ? (
          <ListingCardRating
            ratingAverage={cardRating.ratingAverage}
            reviewCount={cardRating.reviewCount}
          />
        ) : null}
        <ListingPrice
          price={listing.price}
          originalPrice={listing.originalPrice}
          currency={listing.currency}
          isPremium={listing.isPremium}
          isOkazion={listing.isOkazion}
        />

        <CardDescription text={listing.description} />

        <SpecRow specs={specs} />

        {listing.cityName ? (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
            <MapPinIcon size={14} weight="regular" />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {listing.cityName}
            </Typography>
          </Stack>
        ) : null}

        <Box sx={{ flex: 1 }} />

        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.disabled">
            {listingCardRelativeDate(listing)}
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
