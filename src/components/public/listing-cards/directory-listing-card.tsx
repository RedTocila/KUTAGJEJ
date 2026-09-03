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
import { BusinessOpenStatusLine } from '@/components/public/business-open-status-line';
import { ListingCardLink } from '@/components/public/listing-card-link';

import { BusinessPromoBanner } from './business-promo-banner';
import { CardMedia, LISTING_CARD_BROWSE_MEDIA_HEIGHT } from './card-media';
import { CardShell } from './card-shell';
import { findOptionLabel, formatBusinessOpeningHoursForCard, listingPriceAccentColor } from './format-helpers';
import { ListingCardHomepageBody } from './listing-card-homepage-body';
import { ListingCardRating, resolveListingCardRating, type ListingCardRatingSummary } from './listing-card-rating';
import { ListingTitleWithVerified } from './listing-title-with-verified';
import { OkazionCountdownBody } from './okazion-countdown';
import { SpecRow, type Spec } from './spec-row';

function conditionIcon(condition: string | null) {
  if (condition === 'i-ri' || condition === 'si-i-ri') return SparkleIcon;
  return CheckCircleIcon;
}

export type DirectoryListingCardVariant = 'default' | 'cover' | 'compact' | 'homepage' | 'browse';

function DirectoryLeadingLabel({
  label,
  density = 'compact',
}: {
  label: string;
  density?: 'carousel' | 'compact';
}) {
  return (
    <Typography
      noWrap
      sx={{
        fontWeight: 800,
        fontSize: density === 'compact' ? '0.9rem' : '0.92rem',
        color: 'var(--mui-palette-primary-main)',
        lineHeight: 1.2,
        minWidth: 0,
      }}
    >
      {label}
    </Typography>
  );
}

function directoryPromoOverlay(listing: PublicDirectoryListing) {
  if (!listing.announcementTitle?.trim()) return undefined;
  return (
    <BusinessPromoBanner
      title={listing.announcementTitle}
      subtitle={listing.announcementSubtitle}
      bannerUrl={listing.announcementBannerUrl}
      variant="card"
      overlay
    />
  );
}

/** Biznese = venues (eat, drink, reserve) — minimal card layout. */
function BusinessVenueCardBody({
  listing,
  sellerRating = null,
  variant = 'default',
  hideOkazionBadge = false,
  showActionCounts = false,
}: {
  listing: PublicDirectoryListing;
  sellerRating?: ListingCardRatingSummary | null;
  /** `'cover'` is the square crop used on category browse pages. Homepage stays `'default'`. */
  variant?: DirectoryListingCardVariant;
  hideOkazionBadge?: boolean;
  showActionCounts?: boolean;
}) {
  const viewCount = listing.viewCount ?? 0;
  const cardRating = resolveListingCardRating(listing, sellerRating);
  const location = [listing.zoneName, listing.cityName].filter(Boolean).join(', ');

  const openingHoursLabel =
    listing.openStatusLine?.trim() ||
    (listing.openingHours ? formatBusinessOpeningHoursForCard(listing.openingHours) : null);

  const topBadge = listing.reservationsEnabled ? 'Rezervim' : undefined;
  const isDense = variant !== 'default';
  const isBrowseLike = variant === 'browse' || variant === 'homepage';
  const bodyDensity = variant === 'homepage' ? 'carousel' : 'compact';
  const leadingLabel = listing.servicesHighlight?.trim() || listing.categoryLabel;

  return (
    <ListingCardLink
      listingKind="businesses"
      listingId={listing.id}
      href={listingBusinessPublicHref(listing)}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
    >
      <CardShell
        compact={isDense}
        premium={Boolean(listing.isPremium)}
        okazion={Boolean(listing.isOkazion)}
      >
        <CardMedia
          listingKind="businesses"
          listingId={listing.id}
          imageUrl={listing.imageUrl}
          FallbackIcon={StorefrontIcon}
          alt={listing.title}
          height={
            variant === 'browse'
              ? LISTING_CARD_BROWSE_MEDIA_HEIGHT
              : variant === 'homepage' || variant === 'compact' || variant === 'cover'
                ? undefined
                : { xs: 185, md: 200 }
          }
          aspectRatio={
            variant === 'homepage'
              ? '6 / 5'
              : variant === 'cover' || variant === 'compact'
                ? '1 / 1'
                : undefined
          }
          compact={isDense}
          showActionCounts={showActionCounts || isBrowseLike}
          okazionCountdownCompact={isBrowseLike ? false : undefined}
          topLeftBadge={topBadge}
          shareCount={listing.shareCount}
          saveCount={listing.saveCount}
          saved={listing.saved}
          premium={Boolean(listing.isPremium)}
          okazion={Boolean(listing.isOkazion)}
          hideOkazionBadge={hideOkazionBadge}
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
          bottomOverlay={directoryPromoOverlay(listing)}
        />
        {isBrowseLike ? (
          <ListingCardHomepageBody
            title={listing.title}
            titleTrailing={
              cardRating ? (
                <ListingCardRating
                  ratingAverage={cardRating.ratingAverage}
                  reviewCount={cardRating.reviewCount}
                  singleStar={variant !== 'browse'}
                  size="compact"
                />
              ) : null
            }
            leading={<DirectoryLeadingLabel label={leadingLabel} density={bodyDensity} />}
            location={location}
            specsSlot={
              openingHoursLabel ? (
                <BusinessOpenStatusLine statusLine={openingHoursLabel} fontSize="0.75rem" />
              ) : null
            }
            listing={listing}
            viewCount={viewCount}
            density={bodyDensity}
          />
        ) : variant === 'compact' ? (
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
            {hideOkazionBadge && listing.isOkazion ? (
              <OkazionCountdownBody expiresAt={listing.okazionUntil} />
            ) : null}
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

            <Box sx={{ flex: 1 }} />

            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              {location ? (
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ alignItems: 'center', color: 'text.secondary', minWidth: 0, flex: 1 }}
                >
                  <MapPinIcon size={14} weight="regular" color="var(--mui-palette-primary-main)" />
                  <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontWeight: 500, minWidth: 0 }}>
                    {location}
                  </Typography>
                </Stack>
              ) : (
                <Box />
              )}
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
  hideOkazionBadge = false,
  showActionCounts = false,
}: {
  listing: PublicDirectoryListing;
  sellerRating?: ListingCardRatingSummary | null;
  variant?: DirectoryListingCardVariant;
  hideOkazionBadge?: boolean;
  showActionCounts?: boolean;
}) {
  const viewCount = listing.viewCount ?? 0;
  const conditionLabel = listing.condition ? findOptionLabel(MARKETPLACE_CONDITION_OPTIONS, listing.condition) : null;
  const cardRating = resolveListingCardRating(listing, sellerRating);
  const location = [listing.zoneName, listing.cityName].filter(Boolean).join(', ');

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

  const isDense = variant !== 'default';
  const isBrowseLike = variant === 'browse' || variant === 'homepage';
  const bodyDensity = variant === 'homepage' ? 'carousel' : 'compact';

  return (
    <ListingCardLink
      listingKind="professionals"
      listingId={listing.id}
      href={listingProfessionalPublicHref(listing)}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
    >
      <CardShell
        compact={isDense}
        premium={Boolean(listing.isPremium)}
        okazion={Boolean(listing.isOkazion)}
      >
        <CardMedia
          listingKind="professionals"
          listingId={listing.id}
          imageUrl={listing.imageUrl}
          FallbackIcon={BriefcaseIcon}
          alt={listing.title}
          height={
            variant === 'browse'
              ? LISTING_CARD_BROWSE_MEDIA_HEIGHT
              : variant === 'homepage' || variant === 'compact' || variant === 'cover'
                ? undefined
                : { xs: 185, md: 200 }
          }
          aspectRatio={
            variant === 'homepage'
              ? '6 / 5'
              : variant === 'cover' || variant === 'compact'
                ? '1 / 1'
                : undefined
          }
          compact={isDense}
          showActionCounts={showActionCounts || isBrowseLike}
          okazionCountdownCompact={isBrowseLike ? false : undefined}
          shareCount={listing.shareCount}
          saveCount={listing.saveCount}
          saved={listing.saved}
          premium={Boolean(listing.isPremium)}
          okazion={Boolean(listing.isOkazion)}
          hideOkazionBadge={hideOkazionBadge}
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
          bottomOverlay={directoryPromoOverlay(listing)}
        />
        {isBrowseLike ? (
          <ListingCardHomepageBody
            title={listing.title}
            titleTrailing={
              cardRating ? (
                <ListingCardRating
                  ratingAverage={cardRating.ratingAverage}
                  reviewCount={cardRating.reviewCount}
                  singleStar={variant !== 'browse'}
                  size="compact"
                />
              ) : null
            }
            leading={<DirectoryLeadingLabel label={listing.categoryLabel} density={bodyDensity} />}
            location={location}
            specs={specs}
            listing={listing}
            viewCount={viewCount}
            density={bodyDensity}
          />
        ) : variant === 'compact' ? (
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
            {hideOkazionBadge && listing.isOkazion ? (
              <OkazionCountdownBody expiresAt={listing.okazionUntil} />
            ) : null}
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

            <Box sx={{ flex: 1 }} />

            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              {location ? (
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ alignItems: 'center', color: 'text.secondary', minWidth: 0, flex: 1 }}
                >
                  <MapPinIcon size={14} weight="regular" color="var(--mui-palette-primary-main)" />
                  <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontWeight: 500, minWidth: 0 }}>
                    {location}
                  </Typography>
                </Stack>
              ) : (
                <Box />
              )}
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
  hideOkazionBadge = false,
  showActionCounts = false,
}: {
  listing: PublicDirectoryListing;
  sellerRating?: ListingCardRatingSummary | null;
  /** `'cover'` is the square crop used on category browse pages. Homepage stays `'default'`. */
  variant?: DirectoryListingCardVariant;
  hideOkazionBadge?: boolean;
  showActionCounts?: boolean;
}) {
  if (listing.kind === 'businesses') {
    return (
      <BusinessVenueCardBody
        listing={listing}
        sellerRating={sellerRating}
        variant={variant}
        hideOkazionBadge={hideOkazionBadge}
        showActionCounts={showActionCounts}
      />
    );
  }
  return (
    <ProfessionalListingCardBody
      listing={listing}
      sellerRating={sellerRating}
      variant={variant}
      hideOkazionBadge={hideOkazionBadge}
      showActionCounts={showActionCounts}
    />
  );
}
