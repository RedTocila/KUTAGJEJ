'use client';

import * as React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Bathtub as BathtubIcon } from '@phosphor-icons/react/dist/ssr/Bathtub';
import { Bed as BedIcon } from '@phosphor-icons/react/dist/ssr/Bed';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Calendar as CalendarIcon } from '@phosphor-icons/react/dist/ssr/Calendar';
import { Couch as CouchIcon } from '@phosphor-icons/react/dist/ssr/Couch';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { House as HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Ruler as RulerIcon } from '@phosphor-icons/react/dist/ssr/Ruler';
import { Stairs as StairsIcon } from '@phosphor-icons/react/dist/ssr/Stairs';

import { listingRealEstatePublicHref } from '@/paths';
import type { PublicRealEstateListing } from '@/lib/public-listings-client';
import { propertyCategoryLabel } from '@/lib/real-estate-constants';
import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import { ListingCardLink } from '@/components/public/listing-card-link';

import { CardDescription } from './card-description';
import { CardLocationBadge } from './card-location-badge';
import { CardMedia, LISTING_CARD_BROWSE_MEDIA_HEIGHT, LISTING_CARD_HOMEPAGE_ASPECT_RATIO } from './card-media';
import { CardShell } from './card-shell';
import { formatPrice, listingCardRelativeDate } from './format-helpers';
import { ListingCardRating, resolveListingCardRating, type ListingCardRatingSummary } from './listing-card-rating';
import { ListingCardHomepageBody } from './listing-card-homepage-body';
import { ListingPrice } from './listing-price';
import { ListingTitleWithVerified } from './listing-title-with-verified';
import { SpecRow, type Spec } from './spec-row';

export type RealEstateCardVariant = 'default' | 'compact' | 'homepage' | 'browse';

export function RealEstateCard({
  listing,
  sellerRating = null,
  imagePriority = false,
  variant = 'default',
  locationInPriceRow = false,
  hideOkazionBadge = false,
}: {
  listing: PublicRealEstateListing;
  sellerRating?: ListingCardRatingSummary | null;
  imagePriority?: boolean;
  variant?: RealEstateCardVariant;
  locationInPriceRow?: boolean;
  hideOkazionBadge?: boolean;
}) {
  const t = useCopy();
  const { language } = useLanguage();
  const location = [listing.zoneName, listing.cityName].filter(Boolean).join(', ');
  const transactionLabel =
    listing.transactionType === 'rent' ? t.common.forRent : listing.transactionType === 'sale' ? t.common.forSale : '';
  const viewCount = listing.viewCount ?? 0;
  const cardRating = resolveListingCardRating(null, sellerRating);
  const isDense = variant !== 'default';
  const categoryLabel = propertyCategoryLabel(listing.propertyCategory, language);
  const furnishingLabel =
    listing.furnishing === 'furnished'
      ? t.browse.furnished
      : listing.furnishing === 'unfurnished'
        ? t.browse.unfurnished
        : listing.furnishing === 'partially-furnished'
          ? t.browse.partiallyFurnished
          : listing.furnishing === 'kitchen-only'
            ? t.browse.kitchenOnly
            : listing.furnishing;

  const specs: Spec[] = [
    ...(listing.bedrooms != null ? [{ Icon: BedIcon, label: `${listing.bedrooms}`, title: t.browse.bedrooms }] : []),
    ...(listing.bathrooms != null
      ? [{ Icon: BathtubIcon, label: `${listing.bathrooms}`, title: t.browse.bathrooms }]
      : []),
    ...(listing.surfaceM2 != null && Number(listing.surfaceM2) > 0
      ? [{ Icon: RulerIcon, label: `${listing.surfaceM2} m²`, title: t.browse.surface }]
      : []),
    ...(listing.floor != null
      ? [{ Icon: StairsIcon, label: t.browse.floorN(listing.floor), title: t.browse.floorN(listing.floor) }]
      : []),
    ...(listing.yearBuilt != null
      ? [{ Icon: CalendarIcon, label: String(listing.yearBuilt), title: t.browse.yearBuilt }]
      : []),
    ...(listing.furnishing
      ? [{ Icon: CouchIcon, label: furnishingLabel ?? listing.furnishing, title: t.browse.furnishing }]
      : []),
  ];

  const priceLabel =
    formatPrice(listing.price, listing.currency) + (listing.transactionType === 'rent' ? ` ${t.browse.perMonth}` : '');

  const shareSpecs = [
    ...(listing.bedrooms != null ? [{ icon: 'bed' as const, label: `${listing.bedrooms}` }] : []),
    ...(listing.bathrooms != null ? [{ icon: 'bath' as const, label: `${listing.bathrooms}` }] : []),
    ...(listing.surfaceM2 != null && Number(listing.surfaceM2) > 0
      ? [{ icon: 'ruler' as const, label: `${listing.surfaceM2} m²` }]
      : []),
    ...(listing.floor != null ? [{ icon: 'stairs' as const, label: t.browse.floorN(listing.floor) }] : []),
    ...(listing.yearBuilt != null ? [{ icon: 'calendar' as const, label: String(listing.yearBuilt) }] : []),
    ...(listing.furnishing ? [{ icon: 'couch' as const, label: furnishingLabel ?? listing.furnishing }] : []),
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
      <CardShell
        compact={isDense}
        premium={Boolean(listing.isPremium)}
        okazion={Boolean(listing.isOkazion)}
      >
        <CardMedia
          listingKind="real-estate"
          listingId={listing.id}
          imageUrl={listing.imageUrl}
          FallbackIcon={listing.propertyCategory === 'villa' ? HouseIcon : BuildingsIcon}
          alt={listing.title}
          height={
            variant === 'browse'
              ? LISTING_CARD_BROWSE_MEDIA_HEIGHT
              : variant === 'default'
                ? { xs: 185, md: 200 }
                : undefined
          }
          aspectRatio={
            variant === 'homepage' || variant === 'compact'
              ? LISTING_CARD_HOMEPAGE_ASPECT_RATIO
              : undefined
          }
          compact={isDense}
          showActionCounts={variant === 'homepage' || variant === 'browse'}
          okazionCountdownCompact={variant === 'homepage' || variant === 'browse' ? false : undefined}
          topLeftBadge={transactionLabel || undefined}
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
            title: listing.title,
            category: categoryLabel,
            priceLabel,
            badge: transactionLabel,
            imageUrl: listing.imageUrl,
            location: location || undefined,
            specs: shareSpecs,
            createdAt: listing.createdAt,
            viewCount,
            saveCount: listing.saveCount,
            contactPhone: listing.contactPhone?.trim() || undefined,
            url: listingRealEstatePublicHref(listing),
          }}
        />
        {variant === 'homepage' ? (
          <ListingCardHomepageBody
            titleId={`listing-card-title-${listing.id}`}
            title={listing.title}
            price={listing.price}
            originalPrice={listing.originalPrice}
            currency={listing.currency}
            density="carousel"
            priceSuffix={
              listing.transactionType === 'rent' ? (
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 0.35, fontWeight: 500 }}
                >
                  {t.browse.perMonth}
                </Typography>
              ) : null
            }
            location={location}
            specs={specs}
            listing={listing}
            viewCount={viewCount}
          />
        ) : variant === 'browse' ? (
          <ListingCardHomepageBody
            titleId={`listing-card-title-${listing.id}`}
            title={listing.title}
            price={listing.price}
            originalPrice={listing.originalPrice}
            currency={listing.currency}
            density="compact"
            priceSuffix={
              listing.transactionType === 'rent' ? (
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 0.35, fontWeight: 500 }}
                >
                  {t.browse.perMonth}
                </Typography>
              ) : null
            }
            location={location}
            specs={specs}
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
              title={listing.title}
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
                suffix={
                  listing.transactionType === 'rent' ? (
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 0.35, fontWeight: 500 }}
                    >
                      {t.browse.perMonth}
                    </Typography>
                  ) : null
                }
              />
              <CardLocationBadge cityName={listing.cityName} />
            </Stack>
          </Stack>
        ) : (
          <Stack className="listing-card-body" spacing={1} sx={{ p: 1.75 }}>
            <ListingTitleWithVerified
              id={`listing-card-title-${listing.id}`}
              title={listing.title}
              maxLines={1}
              verified={false}
            />
            {cardRating ? (
              <ListingCardRating ratingAverage={cardRating.ratingAverage} reviewCount={cardRating.reviewCount} />
            ) : null}
            {locationInPriceRow ? (
              <Stack
                direction="row"
                sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, minWidth: 0 }}
              >
                <ListingPrice
                  price={listing.price}
                  originalPrice={listing.originalPrice}
                  currency={listing.currency}
                  isPremium={listing.isPremium}
                  isOkazion={listing.isOkazion}
                  suffix={
                    listing.transactionType === 'rent' ? (
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 0.5, fontWeight: 500 }}
                      >
                        {t.browse.perMonth}
                      </Typography>
                    ) : null
                  }
                  sx={{ minWidth: 0, flex: '1 1 auto' }}
                />
                {location ? (
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{
                      alignItems: 'center',
                      color: 'text.secondary',
                      minWidth: 0,
                      maxWidth: '50%',
                      flexShrink: 1,
                    }}
                  >
                    <MapPinIcon size={14} weight="regular" color="var(--mui-palette-primary-main)" />
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{ color: 'text.secondary', fontWeight: 500, minWidth: 0, textAlign: 'right' }}
                    >
                      {location}
                    </Typography>
                  </Stack>
                ) : null}
              </Stack>
            ) : (
              <ListingPrice
                price={listing.price}
                originalPrice={listing.originalPrice}
                currency={listing.currency}
                isPremium={listing.isPremium}
                isOkazion={listing.isOkazion}
                suffix={
                  listing.transactionType === 'rent' ? (
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 0.5, fontWeight: 500 }}
                    >
                      {t.browse.perMonth}
                    </Typography>
                  ) : null
                }
              />
            )}

            <CardDescription text={listing.description} />

            <SpecRow specs={specs} />

            {!locationInPriceRow && location ? (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary', minWidth: 0 }}>
                <MapPinIcon size={14} weight="regular" color="var(--mui-palette-primary-main)" />
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ color: 'text.secondary', fontWeight: 500, minWidth: 0, flex: 1 }}
                >
                  {location}
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
        )}
      </CardShell>
    </ListingCardLink>
  );
}
