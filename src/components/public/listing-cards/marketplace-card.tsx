'use client';

import { Box, Stack, Typography } from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { ShoppingBag as ShoppingBagIcon } from '@phosphor-icons/react/dist/ssr/ShoppingBag';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Tag as TagIcon } from '@phosphor-icons/react/dist/ssr/Tag';

import { listingMarketplacePublicHref } from '@/paths';
import { MARKETPLACE_CATEGORY_OPTIONS, MARKETPLACE_CONDITION_OPTIONS } from '@/lib/marketplace-constants';
import type { PublicMarketplaceListing } from '@/lib/public-listings-client';
import { ListingCardLink } from '@/components/public/listing-card-link';

import { CardDescription } from './card-description';
import { CardMedia } from './card-media';
import { CardShell } from './card-shell';
import { findOptionLabel, formatPrice, listingCardRelativeDate } from './format-helpers';
import { ListingCardRating, resolveListingCardRating, type ListingCardRatingSummary } from './listing-card-rating';
import { ListingPrice } from './listing-price';
import { ListingTitleWithVerified } from './listing-title-with-verified';
import { SpecRow, type Spec } from './spec-row';

function conditionIcon(condition: string | null) {
  if (condition === 'i-ri' || condition === 'si-i-ri') return SparkleIcon;
  return CheckCircleIcon;
}

export function MarketplaceCard({
  listing,
  sellerRating = null,
  imagePriority = false,
  variant = 'default',
}: {
  listing: PublicMarketplaceListing;
  sellerRating?: ListingCardRatingSummary | null;
  imagePriority?: boolean;
  /** 'compact' is used on 2-column mobile category browse page. 'default' is classic full-detail card. */
  variant?: 'default' | 'compact';
}) {
  const viewCount = listing.viewCount ?? 0;
  const categoryLabel = findOptionLabel(MARKETPLACE_CATEGORY_OPTIONS, listing.category);
  const conditionLabel = listing.condition ? findOptionLabel(MARKETPLACE_CONDITION_OPTIONS, listing.condition) : null;
  const cardRating = resolveListingCardRating(null, sellerRating);

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
      <CardShell premium={Boolean(listing.isPremium)} okazion={Boolean(listing.isOkazion)}>
        <CardMedia
          listingKind="marketplace"
          listingId={listing.id}
          imageUrl={listing.imageUrl}
          FallbackIcon={ShoppingBagIcon}
          alt={listing.title}
          aspectRatio="4 / 3"
          compact={variant === 'compact'}
          topLeftBadge={conditionLabel ?? undefined}
          shareCount={listing.shareCount}
          saveCount={listing.saveCount}
          saved={listing.saved}
          premium={Boolean(listing.isPremium)}
          okazion={Boolean(listing.isOkazion)}
          okazionUntil={listing.okazionUntil}
          sellerVerified={variant === 'default' && Boolean(listing.sellerVerified)}
          sellerTrustBadge={variant === 'default' && Boolean(listing.sellerTrustBadge)}
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
        {variant === 'compact' ? (
          <Stack className="listing-card-body" spacing={{ xs: 0.5, sm: 0.7 }} sx={{ p: { xs: 1.1, sm: 1.35 } }}>
            <ListingTitleWithVerified
              title={listing.title}
              maxLines={1}
              verified={false}
              trustBadge={false}
              typographySx={{
                fontSize: { xs: '0.85rem', sm: '0.92rem' },
                fontWeight: 700,
                lineHeight: 1.3,
              }}
            />

            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <ListingPrice
                price={listing.price}
                originalPrice={listing.originalPrice}
                currency={listing.currency}
                isPremium={listing.isPremium}
                isOkazion={listing.isOkazion}
                fontSize="1rem"
              />
              <Stack
                direction="row"
                spacing={0.35}
                sx={{ alignItems: 'center', color: 'text.disabled', flexShrink: 0 }}
              >
                <EyeIcon size={12} weight="regular" />
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                  {new Intl.NumberFormat('en-GB').format(viewCount)}
                </Typography>
              </Stack>
            </Stack>
          </Stack>
        ) : (
          <Stack className="listing-card-body" spacing={1} sx={{ p: 1.75 }}>
            <ListingTitleWithVerified title={listing.title} maxLines={1} verified={false} trustBadge={false} />
            {cardRating ? (
              <ListingCardRating ratingAverage={cardRating.ratingAverage} reviewCount={cardRating.reviewCount} />
            ) : null}
            <ListingPrice
              price={listing.price}
              originalPrice={listing.originalPrice}
              currency={listing.currency}
              isPremium={listing.isPremium}
              isOkazion={listing.isOkazion}
              okazionUntil={listing.okazionUntil}
              showOkazionCountdown={Boolean(listing.isOkazion)}
            />

            <CardDescription text={listing.description} />

            <SpecRow specs={fullSpecs} />

            {listing.cityName ? (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary', minWidth: 0 }}>
                <MapPinIcon size={14} weight="regular" />
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
