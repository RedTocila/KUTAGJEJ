'use client';

import * as React from 'react';
import { ListingCardLink } from '@/components/public/listing-card-link';
import { Box, Stack, Typography } from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { ShoppingBag as ShoppingBagIcon } from '@phosphor-icons/react/dist/ssr/ShoppingBag';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Tag as TagIcon } from '@phosphor-icons/react/dist/ssr/Tag';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';

import { MARKETPLACE_CATEGORY_OPTIONS, MARKETPLACE_CONDITION_OPTIONS } from '@/lib/marketplace-constants';
import type { PublicMarketplaceListing } from '@/lib/public-listings-client';
import { listingMarketplacePublicHref } from '@/paths';

import { CardDescription } from './card-description';
import { CardMedia } from './card-media';
import { CardShell } from './card-shell';
import { findOptionLabel, formatPrice, relativeAlbanianDate } from './format-helpers';
import { ListingPrice } from './listing-price';
import { ListingTitleWithVerified } from './listing-title-with-verified';
import {
  ListingCardRating,
  resolveListingCardRating,
  type ListingCardRatingSummary,
} from './listing-card-rating';
import { SpecRow, type Spec } from './spec-row';

function conditionIcon(condition: string | null) {
  if (condition === 'i-ri' || condition === 'si-i-ri') return SparkleIcon;
  return CheckCircleIcon;
}

export function MarketplaceCard({
  listing,
  sellerRating = null,
  imagePriority = false,
}: {
  listing: PublicMarketplaceListing;
  sellerRating?: ListingCardRatingSummary | null;
  imagePriority?: boolean;
}) {
  const viewCount = listing.viewCount ?? 0;
  const categoryLabel = findOptionLabel(MARKETPLACE_CATEGORY_OPTIONS, listing.category);
  const conditionLabel = listing.condition ? findOptionLabel(MARKETPLACE_CONDITION_OPTIONS, listing.condition) : null;
  const cardRating = resolveListingCardRating(null, sellerRating);

  const specs: Spec[] = [
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
      <CardShell premium={Boolean(listing.isPremium)} okazion={Boolean(listing.isOkazion)}>
      <CardMedia
        listingKind="marketplace"
        listingId={listing.id}
        imageUrl={listing.imageUrl}
        FallbackIcon={ShoppingBagIcon}
        alt={listing.title}
        topLeftBadge={conditionLabel ?? undefined}
        shareCount={listing.shareCount}
        saveCount={listing.saveCount}
        saved={listing.saved}
        premium={Boolean(listing.isPremium)}
        okazion={Boolean(listing.isOkazion)}
        okazionUntil={listing.okazionUntil}
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
          url: listingMarketplacePublicHref(listing),
        }}
      />
      <Stack className="listing-card-body" spacing={1} sx={{ p: { xs: 1.75, sm: 2 } }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.7rem' }}
        >
          {categoryLabel}
        </Typography>
        <ListingTitleWithVerified
          title={listing.title}
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
