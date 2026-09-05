'use client';

import { Box, Stack, Typography } from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { ShoppingBag as ShoppingBagIcon } from '@phosphor-icons/react/dist/ssr/ShoppingBag';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Tag as TagIcon } from '@phosphor-icons/react/dist/ssr/Tag';

import { listingMarketplacePublicHref } from '@/paths';
import { MARKETPLACE_CATEGORY_OPTIONS, MARKETPLACE_CONDITION_OPTIONS } from '@/lib/marketplace-constants';
import type { PublicMarketplaceListing } from '@/lib/public-listings-client';
import { ListingCardLink } from '@/components/public/listing-card-link';

import { CardDescription } from './card-description';
import { CardLocationBadge } from './card-location-badge';
import { CardMedia, LISTING_CARD_BROWSE_MEDIA_HEIGHT, LISTING_CARD_HOMEPAGE_ASPECT_RATIO } from './card-media';
import { CardShell } from './card-shell';
import { findOptionLabel, formatPrice, listingCardRelativeDate } from './format-helpers';
import { ListingCardRating, resolveListingCardRating, type ListingCardRatingSummary } from './listing-card-rating';
import { ListingCardHomepageBody } from './listing-card-homepage-body';
import { ListingPrice } from './listing-price';
import { ListingTitleWithVerified } from './listing-title-with-verified';
import { SpecRow, type Spec } from './spec-row';

function conditionIcon(condition: string | null) {
  if (condition === 'i-ri' || condition === 'si-i-ri') return SparkleIcon;
  return CheckCircleIcon;
}

export type MarketplaceCardVariant = 'default' | 'compact' | 'homepage' | 'browse';

export function MarketplaceCard({
  listing,
  sellerRating = null,
  imagePriority = false,
  variant = 'default',
  hideOkazionBadge = false,
}: {
  listing: PublicMarketplaceListing;
  sellerRating?: ListingCardRatingSummary | null;
  imagePriority?: boolean;
  /** 'compact' = browse 2-col grid. 'homepage' = homepage carousel. */
  variant?: MarketplaceCardVariant;
  hideOkazionBadge?: boolean;
}) {
  const viewCount = listing.viewCount ?? 0;
  const categoryLabel = findOptionLabel(MARKETPLACE_CATEGORY_OPTIONS, listing.category);
  const conditionLabel = listing.condition ? findOptionLabel(MARKETPLACE_CONDITION_OPTIONS, listing.condition) : null;
  const cardRating = resolveListingCardRating(null, sellerRating);

  const isDense = variant !== 'default';

  const fullSpecs: Spec[] = [
    { Icon: TagIcon, label: categoryLabel, title: 'Kategoria' },
    ...(conditionLabel ? [{ Icon: conditionIcon(listing.condition), label: conditionLabel, title: 'Gjendja' }] : []),
  ];

  return (
    <ListingCardLink
      listingKind="marketplace"
      listingId={listing.id}
      href={listingMarketplacePublicHref(listing)}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
    >
      <CardShell
        compact={isDense}
        premium={Boolean(listing.isPremium)}
        okazion={Boolean(listing.isOkazion)}
      >
        <CardMedia
          listingKind="marketplace"
          listingId={listing.id}
          imageUrl={listing.imageUrl}
          FallbackIcon={ShoppingBagIcon}
          alt={listing.title}
          height={variant === 'browse' ? LISTING_CARD_BROWSE_MEDIA_HEIGHT : undefined}
          aspectRatio={
            variant === 'homepage' || variant === 'compact'
              ? LISTING_CARD_HOMEPAGE_ASPECT_RATIO
              : variant === 'browse'
                ? undefined
                : LISTING_CARD_HOMEPAGE_ASPECT_RATIO
          }
          compact={isDense}
          showActionCounts={variant === 'homepage' || variant === 'browse'}
          okazionCountdownCompact={variant === 'homepage' || variant === 'browse' ? false : undefined}
          topLeftBadge={conditionLabel ?? undefined}
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
            priceLabel: formatPrice(listing.price, listing.currency),
            badge: conditionLabel ?? undefined,
            imageUrl: listing.imageUrl,
            location: listing.cityName || undefined,
            specs: [
              { icon: 'tag', label: categoryLabel },
              ...(conditionLabel
                ? [
                    {
                      icon:
                        listing.condition === 'i-ri' || listing.condition === 'si-i-ri'
                          ? ('sparkle' as const)
                          : ('check' as const),
                      label: conditionLabel,
                    },
                  ]
                : []),
            ],
            createdAt: listing.createdAt,
            viewCount,
            saveCount: listing.saveCount,
            contactPhone: listing.contactPhone?.trim() || undefined,
            url: listingMarketplacePublicHref(listing),
          }}
        />
        {variant === 'homepage' ? (
          <ListingCardHomepageBody
            title={listing.title}
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
            title={listing.title}
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
              />
              <CardLocationBadge cityName={listing.cityName} />
            </Stack>
          </Stack>
        ) : (
          <Stack className="listing-card-body" spacing={1} sx={{ p: 1.75 }}>
            <ListingTitleWithVerified title={listing.title} maxLines={1} verified={false} />
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
