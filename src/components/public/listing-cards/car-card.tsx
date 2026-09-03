'use client';

import { Box, Stack, Typography } from '@mui/material';
import { Calendar as CalendarIcon } from '@phosphor-icons/react/dist/ssr/Calendar';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { GasPump as GasPumpIcon } from '@phosphor-icons/react/dist/ssr/GasPump';
import { Gauge as GaugeIcon } from '@phosphor-icons/react/dist/ssr/Gauge';
import { GearSix as GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { PaintBucket as PaintBucketIcon } from '@phosphor-icons/react/dist/ssr/PaintBucket';

import { listingCarPublicHref } from '@/paths';
import { CAR_COLOUR_OPTIONS, FUEL_TYPE_OPTIONS, TRANSMISSION_OPTIONS } from '@/lib/car-constants';
import type { PublicCarListing } from '@/lib/public-listings-client';
import { ListingCardLink } from '@/components/public/listing-card-link';

import { CardDescription } from './card-description';
import { CardLocationBadge } from './card-location-badge';
import { CardMedia, LISTING_CARD_BROWSE_MEDIA_HEIGHT } from './card-media';
import { CardShell } from './card-shell';
import { findOptionLabel, formatKilometers, formatPrice, listingCardRelativeDate } from './format-helpers';
import { ListingCardRating, resolveListingCardRating, type ListingCardRatingSummary } from './listing-card-rating';
import { ListingCardHomepageBody } from './listing-card-homepage-body';
import { ListingPrice } from './listing-price';
import { ListingTitleWithVerified } from './listing-title-with-verified';
import { SpecRow, type Spec } from './spec-row';

export type CarCardVariant = 'default' | 'compact' | 'homepage' | 'browse';

export function CarCard({
  listing,
  sellerRating = null,
  imagePriority = false,
  variant = 'default',
  hideOkazionBadge = false,
}: {
  listing: PublicCarListing;
  sellerRating?: ListingCardRatingSummary | null;
  imagePriority?: boolean;
  /** 'compact' = browse 2-col grid. 'homepage' = homepage carousel. */
  variant?: CarCardVariant;
  hideOkazionBadge?: boolean;
}) {
  const title = [listing.make, listing.model, listing.variant].filter(Boolean).join(' ');
  const viewCount = listing.viewCount ?? 0;
  const fuelLabel = findOptionLabel(FUEL_TYPE_OPTIONS, listing.fuelType);
  const transmissionLabel = findOptionLabel(TRANSMISSION_OPTIONS, listing.transmission);
  const colourLabel = findOptionLabel(CAR_COLOUR_OPTIONS, listing.color);
  const cardRating = resolveListingCardRating(null, sellerRating);

  const isDense = variant !== 'default';

  const fullSpecs: Spec[] = [
    ...(listing.year != null ? [{ Icon: CalendarIcon, label: String(listing.year), title: 'Viti' }] : []),
    ...(listing.kilometers != null
      ? [{ Icon: GaugeIcon, label: formatKilometers(listing.kilometers), title: 'Kilometrazh' }]
      : []),
    ...(fuelLabel ? [{ Icon: GasPumpIcon, label: fuelLabel, title: 'Karburant' }] : []),
    ...(transmissionLabel ? [{ Icon: GearSixIcon, label: transmissionLabel, title: 'Transmision' }] : []),
    ...(listing.color && colourLabel ? [{ Icon: PaintBucketIcon, label: colourLabel, title: 'Ngjyra' }] : []),
  ];

  return (
    <ListingCardLink
      listingKind="car"
      listingId={listing.id}
      href={listingCarPublicHref(listing)}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
    >
      <CardShell
        compact={isDense}
        premium={Boolean(listing.isPremium)}
        okazion={Boolean(listing.isOkazion)}
      >
        <CardMedia
          listingKind="car"
          listingId={listing.id}
          imageUrl={listing.imageUrl}
          FallbackIcon={CarIcon}
          alt={title}
          height={variant === 'browse' ? LISTING_CARD_BROWSE_MEDIA_HEIGHT : undefined}
          aspectRatio={
            variant === 'homepage' ? '6 / 5' : variant === 'compact' ? '1 / 1' : variant === 'browse' ? undefined : '4 / 3'
          }
          compact={isDense}
          showActionCounts={variant === 'homepage' || variant === 'browse'}
          okazionCountdownCompact={variant === 'homepage' || variant === 'browse' ? false : undefined}
          topLeftBadge={`${listing.year}`}
          shareCount={listing.shareCount}
          saveCount={listing.saveCount}
          saved={listing.saved}
          premium={Boolean(listing.isPremium)}
          okazion={Boolean(listing.isOkazion)}
          hideOkazionBadge={hideOkazionBadge}
          okazionUntil={listing.okazionUntil}
          sellerVerified={Boolean(listing.sellerVerified)}
          priority={imagePriority}
          sharePayload={{
            title,
            category: listing.make,
            priceLabel: formatPrice(listing.price, listing.currency),
            badge: String(listing.year),
            imageUrl: listing.imageUrl,
            location: listing.cityName || undefined,
            specs: [
              ...(listing.year != null ? [{ icon: 'calendar' as const, label: String(listing.year) }] : []),
              ...(listing.kilometers != null
                ? [{ icon: 'gauge' as const, label: formatKilometers(listing.kilometers) }]
                : []),
              ...(fuelLabel ? [{ icon: 'gas' as const, label: fuelLabel }] : []),
              ...(transmissionLabel ? [{ icon: 'gear' as const, label: transmissionLabel }] : []),
              ...(listing.color && colourLabel ? [{ icon: 'paint' as const, label: colourLabel }] : []),
            ],
            createdAt: listing.createdAt,
            viewCount,
            saveCount: listing.saveCount,
            contactPhone: listing.contactPhone?.trim() || undefined,
            url: listingCarPublicHref(listing),
          }}
        />
        {variant === 'homepage' ? (
          <ListingCardHomepageBody
            title={title}
            price={listing.price}
            originalPrice={listing.originalPrice}
            currency={listing.currency}
            location={listing.cityName}
            specs={fullSpecs}
            listing={listing}
            viewCount={viewCount}
          />
        ) : variant === 'browse' ? (
          <ListingCardHomepageBody
            title={title}
            price={listing.price}
            originalPrice={listing.originalPrice}
            currency={listing.currency}
            density="compact"
            location={listing.cityName}
            specs={fullSpecs}
            listing={listing}
            viewCount={viewCount}
          />
        ) : variant === 'compact' ? (
          <Stack
            className="listing-card-body"
            spacing={{ xs: 0.25, sm: 0.4 }}
            sx={{ pt: { xs: 0.65, sm: 0.8 }, px: { xs: 0.25, sm: 0.4 }, pb: { xs: 0.8, sm: 1 } }}
          >
            <ListingTitleWithVerified
              title={title}
              maxLines={1}
              verified={false}
              typographySx={{
                fontSize: { xs: '0.76rem', sm: '0.82rem' },
                fontWeight: 650,
                lineHeight: 1.25,
              }}
            />

            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <ListingPrice
                price={listing.price}
                originalPrice={listing.originalPrice}
                currency={listing.currency}
                isPremium={listing.isPremium}
                isOkazion={listing.isOkazion}
                fontSize="0.9rem"
                fontWeight={800}
              />
              <CardLocationBadge cityName={listing.cityName} />
            </Stack>
          </Stack>
        ) : (
          <Stack className="listing-card-body" spacing={1} sx={{ p: 1.75 }}>
            <ListingTitleWithVerified title={title} maxLines={1} verified={false} />
            {cardRating ? (
              <ListingCardRating ratingAverage={cardRating.ratingAverage} reviewCount={cardRating.reviewCount} />
            ) : null}
            <ListingPrice
              price={listing.price}
              originalPrice={listing.originalPrice}
              currency={listing.currency}
              isPremium={listing.isPremium}
              isOkazion={listing.isOkazion}
            />

            <CardDescription text={listing.description} />

            <SpecRow specs={fullSpecs} />

            {listing.cityName ? (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary', minWidth: 0 }}>
                <MapPinIcon size={14} weight="regular" color="var(--mui-palette-primary-main)" />
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ color: 'text.secondary', fontWeight: 500, minWidth: 0, flex: 1 }}
                >
                  {listing.cityName}
                </Typography>
              </Stack>
            ) : null}

            <Box sx={{ flex: 1 }} />

            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.disabled">
                {listingCardRelativeDate(listing)}
              </Typography>
              <CardLocationBadge cityName={listing.cityName} iconSize={14} />
            </Stack>
          </Stack>
        )}
      </CardShell>
    </ListingCardLink>
  );
}
