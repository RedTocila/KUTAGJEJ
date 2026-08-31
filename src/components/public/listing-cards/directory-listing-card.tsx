'use client';

import * as React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Clock as ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { Tag as TagIcon } from '@phosphor-icons/react/dist/ssr/Tag';

import { listingBusinessPublicHref, listingProfessionalPublicHref } from '@/paths';
import { MARKETPLACE_CONDITION_OPTIONS } from '@/lib/marketplace-constants';
import type { PublicDirectoryListing } from '@/lib/public-listings-client';
import { ListingCardLink } from '@/components/public/listing-card-link';
import { BusinessOpenStatusLine } from '@/components/public/business-open-status-line';

import { BusinessPromoBanner } from './business-promo-banner';
import { CardMedia } from './card-media';
import { CardShell } from './card-shell';
import {
  findOptionLabel,
  formatBusinessOpeningHoursForCard,
  listingCardRelativeDate,
  listingPriceAccentColor,
} from './format-helpers';
import { ListingCardRating, resolveListingCardRating, type ListingCardRatingSummary } from './listing-card-rating';
import { ListingTitleWithVerified } from './listing-title-with-verified';
import { SpecRow, type Spec } from './spec-row';

function conditionIcon(condition: string | null) {
  if (condition === 'i-ri' || condition === 'si-i-ri') return SparkleIcon;
  return CheckCircleIcon;
}

export type DirectoryListingCardVariant = 'default' | 'cover' | 'compact';

/** Biznese = venues (eat, drink, reserve) — minimal card layout. */
function BusinessVenueCardBody({
  listing,
  sellerRating = null,
  variant = 'default',
}: {
  listing: PublicDirectoryListing;
  sellerRating?: ListingCardRatingSummary | null;
  /** `'cover'` is the square crop used on category browse pages. Homepage stays `'default'`. */
  variant?: DirectoryListingCardVariant;
}) {
  const viewCount = listing.viewCount ?? 0;
  const cardRating = resolveListingCardRating(listing, sellerRating);

  const openingHoursLabel =
    listing.openStatusLine?.trim() ||
    (listing.openingHours ? formatBusinessOpeningHoursForCard(listing.openingHours) : null);

  const topBadge = listing.reservationsEnabled ? 'Rezervim' : undefined;

  return (
    <ListingCardLink
      listingKind="businesses"
      listingId={listing.id}
      href={listingBusinessPublicHref(listing)}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
    >
      <CardShell
        compact={variant === 'compact'}
        premium={Boolean(listing.isPremium)}
        okazion={Boolean(listing.isOkazion)}
      >
        <CardMedia
          listingKind="businesses"
          listingId={listing.id}
          imageUrl={listing.imageUrl}
          FallbackIcon={StorefrontIcon}
          alt={listing.title}
          height={{ xs: 185, md: 200 }}
          aspectRatio={variant === 'cover' || variant === 'compact' ? '1 / 1' : undefined}
          compact={variant === 'compact'}
          topLeftBadge={topBadge}
          shareCount={listing.shareCount}
          saveCount={listing.saveCount}
          saved={listing.saved}
          premium={Boolean(listing.isPremium)}
          okazion={Boolean(listing.isOkazion)}
          okazionUntil={listing.okazionUntil}
          sellerVerified={Boolean(listing.sellerVerified)}
          sharePayload={{
            title: listing.title,
            category: listing.categoryLabel,
            badge: topBadge,
            imageUrl: listing.imageUrl,
            location: listing.cityName || undefined,
            specs: [
              { icon: 'storefront', label: listing.categoryLabel },
              ...(openingHoursLabel ? [{ icon: 'clock' as const, label: openingHoursLabel }] : []),
              ...(listing.reservationsEnabled ? [{ icon: 'calendar' as const, label: 'Rezervim' }] : []),
            ],
            createdAt: listing.createdAt,
            viewCount,
            saveCount: listing.saveCount,
            ratingAverage: cardRating?.ratingAverage,
            reviewCount: cardRating?.reviewCount,
            contactPhone: listing.contactPhone?.trim() || undefined,
            url: listingBusinessPublicHref(listing),
          }}
          bottomOverlay={
            listing.announcementTitle?.trim() ? (
              <BusinessPromoBanner
                title={listing.announcementTitle}
                subtitle={listing.announcementSubtitle}
                bannerUrl={listing.announcementBannerUrl}
                variant="card"
                overlay
              />
            ) : undefined
          }
        />
        {variant === 'compact' ? (
          <Stack
            className="listing-card-body"
            spacing={{ xs: 0.25, sm: 0.4 }}
            sx={{ pt: { xs: 0.65, sm: 0.8 }, px: { xs: 0.25, sm: 0.4 }, pb: { xs: 0.8, sm: 1 } }}
          >
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
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
              </Box>
              {cardRating ? (
                <ListingCardRating
                  ratingAverage={cardRating.ratingAverage}
                  reviewCount={cardRating.reviewCount}
                  singleStar
                />
              ) : null}
            </Stack>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Typography
                variant="caption"
                noWrap
                sx={{ color: 'text.secondary', fontWeight: 600, minWidth: 0, flex: 1 }}
              >
                {listing.categoryLabel}
              </Typography>
            </Stack>
          </Stack>
        ) : (
          <Stack className="listing-card-body" spacing={1} sx={{ p: 1.75 }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <ListingTitleWithVerified
                  title={listing.title}
                  maxLines={1}
                  verified={false}
                  typographySx={
                    listing.isPremium || listing.isOkazion
                      ? {
                          color: listingPriceAccentColor({
                            isPremium: listing.isPremium,
                            isOkazion: listing.isOkazion,
                          }),
                        }
                      : undefined
                  }
                />
              </Box>
              {cardRating ? (
                <ListingCardRating
                  ratingAverage={cardRating.ratingAverage}
                  reviewCount={cardRating.reviewCount}
                  singleStar
                />
              ) : null}
            </Stack>

            {listing.servicesHighlight ? (
              <Typography
                variant="body2"
                noWrap
                sx={{ color: 'primary.main', fontWeight: 600, lineHeight: 1.35, minWidth: 0 }}
              >
                {listing.servicesHighlight}
              </Typography>
            ) : null}

            {openingHoursLabel ? (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
                <Box sx={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                  <BusinessOpenStatusLine statusLine={openingHoursLabel} fontSize="0.75rem" />
                </Box>
              </Stack>
            ) : null}

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

/** Profesionistë — services profile (no price line). */
function ProfessionalListingCardBody({
  listing,
  sellerRating = null,
  variant = 'default',
}: {
  listing: PublicDirectoryListing;
  sellerRating?: ListingCardRatingSummary | null;
  variant?: DirectoryListingCardVariant;
}) {
  const viewCount = listing.viewCount ?? 0;
  const conditionLabel = listing.condition ? findOptionLabel(MARKETPLACE_CONDITION_OPTIONS, listing.condition) : null;
  const cardRating = resolveListingCardRating(listing, sellerRating);

  const serviceTags = React.useMemo(() => {
    const raw = String(listing.servicesHighlight ?? '').trim();
    if (!raw) return [] as string[];
    return raw
      .split(/[·•|,;/]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 4);
  }, [listing.servicesHighlight]);

  const specs: Spec[] = [
    { Icon: TagIcon, label: listing.categoryLabel, title: 'Kategoria' },
    ...serviceTags.map((tag) => ({ Icon: SparkleIcon, label: tag, title: 'Shërbim' })),
    ...(conditionLabel ? [{ Icon: conditionIcon(listing.condition), label: conditionLabel, title: 'Gjendja' }] : []),
    ...(listing.responseTimeHours != null && listing.responseTimeHours > 0
      ? [
          {
            Icon: ClockIcon,
            label:
              listing.responseTimeHours === 1 ? 'Përgjigje në 1 orë' : `Përgjigje në ${listing.responseTimeHours} orë`,
            title: 'Koha e përgjigjes',
          },
        ]
      : []),
  ];

  return (
    <ListingCardLink
      listingKind="professionals"
      listingId={listing.id}
      href={listingProfessionalPublicHref(listing)}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
    >
      <CardShell
        compact={variant === 'compact'}
        premium={Boolean(listing.isPremium)}
        okazion={Boolean(listing.isOkazion)}
      >
        <CardMedia
          listingKind="professionals"
          listingId={listing.id}
          imageUrl={listing.imageUrl}
          FallbackIcon={BriefcaseIcon}
          alt={listing.title}
          height={{ xs: 185, md: 200 }}
          aspectRatio={variant === 'cover' || variant === 'compact' ? '1 / 1' : undefined}
          compact={variant === 'compact'}
          shareCount={listing.shareCount}
          saveCount={listing.saveCount}
          saved={listing.saved}
          premium={Boolean(listing.isPremium)}
          okazion={Boolean(listing.isOkazion)}
          okazionUntil={listing.okazionUntil}
          sellerVerified={Boolean(listing.sellerVerified)}
          sharePayload={{
            title: listing.title,
            category: listing.categoryLabel,
            badge: conditionLabel ?? undefined,
            imageUrl: listing.imageUrl,
            location: listing.cityName || undefined,
            specs: [
              { icon: 'tag', label: listing.categoryLabel },
              ...serviceTags.map((tag) => ({ icon: 'sparkle' as const, label: tag })),
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
              ...(listing.responseTimeHours != null && listing.responseTimeHours > 0
                ? [
                    {
                      icon: 'clock' as const,
                      label:
                        listing.responseTimeHours === 1
                          ? 'Përgjigje në 1 orë'
                          : `Përgjigje në ${listing.responseTimeHours} orë`,
                    },
                  ]
                : []),
            ],
            createdAt: listing.createdAt,
            viewCount,
            saveCount: listing.saveCount,
            ratingAverage: cardRating?.ratingAverage,
            reviewCount: cardRating?.reviewCount,
            contactPhone: listing.contactPhone?.trim() || undefined,
            url: listingProfessionalPublicHref(listing),
          }}
          bottomOverlay={
            listing.announcementTitle?.trim() ? (
              <BusinessPromoBanner
                title={listing.announcementTitle}
                subtitle={listing.announcementSubtitle}
                bannerUrl={listing.announcementBannerUrl}
                variant="card"
                overlay
              />
            ) : undefined
          }
        />
        {variant === 'compact' ? (
          <Stack
            className="listing-card-body"
            spacing={{ xs: 0.25, sm: 0.4 }}
            sx={{ pt: { xs: 0.65, sm: 0.8 }, px: { xs: 0.25, sm: 0.4 }, pb: { xs: 0.8, sm: 1 } }}
          >
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
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
              </Box>
              {cardRating ? (
                <ListingCardRating
                  ratingAverage={cardRating.ratingAverage}
                  reviewCount={cardRating.reviewCount}
                  singleStar
                />
              ) : null}
            </Stack>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Typography
                variant="caption"
                noWrap
                sx={{ color: 'text.secondary', fontWeight: 600, minWidth: 0, flex: 1 }}
              >
                {listing.categoryLabel}
              </Typography>
            </Stack>
          </Stack>
        ) : (
          <Stack className="listing-card-body" spacing={1} sx={{ p: 1.75 }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <ListingTitleWithVerified
                  title={listing.title}
                  maxLines={1}
                  verified={false}
                  typographySx={
                    listing.isPremium || listing.isOkazion
                      ? {
                          color: listingPriceAccentColor({
                            isPremium: listing.isPremium,
                            isOkazion: listing.isOkazion,
                          }),
                        }
                      : undefined
                  }
                />
              </Box>
              {cardRating ? (
                <ListingCardRating
                  ratingAverage={cardRating.ratingAverage}
                  reviewCount={cardRating.reviewCount}
                  singleStar
                />
              ) : null}
            </Stack>
            <SpecRow specs={specs} />

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

export function DirectoryListingCard({
  listing,
  sellerRating = null,
  variant = 'default',
}: {
  listing: PublicDirectoryListing;
  sellerRating?: ListingCardRatingSummary | null;
  /** `'cover'` is the square crop used on category browse pages. Homepage stays `'default'`. */
  variant?: DirectoryListingCardVariant;
}) {
  if (listing.kind === 'businesses') {
    return <BusinessVenueCardBody listing={listing} sellerRating={sellerRating} variant={variant} />;
  }
  return <ProfessionalListingCardBody listing={listing} sellerRating={sellerRating} variant={variant} />;
}
