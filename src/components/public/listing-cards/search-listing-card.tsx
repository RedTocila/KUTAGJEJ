'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Avatar, Box, Stack, Typography } from '@mui/material';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { Handshake as HandshakeIcon } from '@phosphor-icons/react/dist/ssr/Handshake';
import { ShoppingBag as ShoppingBagIcon } from '@phosphor-icons/react/dist/ssr/ShoppingBag';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';

import {
  SearchHitCard,
  searchHitListTextSx,
  type SearchHitVariant,
} from '@/components/public/listing-cards/search-hit-card';
import { ListingTrustBadge } from '@/components/public/listing-trust-badge';
import {
  ListingVerifiedBadge,
  ProfessionalRatingSummary,
} from '@/components/public/professional-listing-detail-ui';
import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import { vehicleTypeLabel } from '@/lib/car-constants';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { formatRatingDisplay } from '@/lib/format-rating';
import { JOB_TYPE_OPTIONS } from '@/lib/job-constants';
import { getJobListingExpiresAt } from '@/lib/job-listing-expiry';
import { MARKETPLACE_CATEGORY_OPTIONS } from '@/lib/marketplace-constants';
import type {
  PublicCarListing,
  PublicDirectoryListing,
  PublicJobListing,
  PublicMarketplaceListing,
  PublicRealEstateListing,
} from '@/lib/public-listings-client';
import { propertyCategoryLabel } from '@/lib/real-estate-constants';
import { avatarImageUrl } from '@/lib/storage-image';
import {
  listingBusinessPublicHref,
  listingCarPublicHref,
  listingJobPublicHref,
  listingMarketplacePublicHref,
  listingProfessionalPublicHref,
  listingRealEstatePublicHref,
} from '@/paths';

import { findOptionLabel } from './format-helpers';
import { JobListingCountdownPlaceholder } from './job-listing-countdown';
import { ListingPrice } from './listing-price';

const JobListingCountdown = dynamic(
  () => import('./job-listing-countdown').then((m) => m.JobListingCountdown),
  {
    ssr: false,
    loading: () => <JobListingCountdownPlaceholder variant="compact" />,
  },
);

export type SearchListingItem =
  | { kind: 'real-estate'; listing: PublicRealEstateListing }
  | { kind: 'car'; listing: PublicCarListing }
  | { kind: 'job'; listing: PublicJobListing }
  | { kind: 'marketplace'; listing: PublicMarketplaceListing }
  | { kind: 'businesses'; listing: PublicDirectoryListing }
  | { kind: 'professionals'; listing: PublicDirectoryListing };

function joinMeta(parts: Array<string | number | null | undefined>): string {
  return parts
    .map((part) => (part == null ? '' : String(part).trim()))
    .filter(Boolean)
    .join(' · ');
}

function SearchListingBody({
  href,
  title,
  subtitle,
  imageUrl,
  FallbackIcon,
  verified,
  trustBadge,
  price,
  originalPrice,
  currency,
  isPremium,
  isOkazion,
  priceSuffix,
  ratingAverage,
  reviewCount,
  bottomRight,
  variant = 'card',
  divider = false,
}: {
  href: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  FallbackIcon: PhosphorIcon;
  verified?: boolean;
  trustBadge?: boolean;
  price?: number | null;
  originalPrice?: number | null;
  currency?: string | null;
  isPremium?: boolean;
  isOkazion?: boolean;
  priceSuffix?: React.ReactNode;
  ratingAverage?: number | null;
  reviewCount?: number;
  bottomRight?: React.ReactNode;
  variant?: SearchHitVariant;
  divider?: boolean;
}): React.JSX.Element {
  const showPrice = price !== undefined;
  const showRating =
    (reviewCount ?? 0) > 0 || (ratingAverage != null && Number.isFinite(ratingAverage));
  const ratingLabel =
    showRating && (reviewCount ?? 0) > 0 && ratingAverage != null && Number.isFinite(ratingAverage)
      ? formatRatingDisplay(ratingAverage)
      : formatRatingDisplay(0);

  const isList = variant === 'list';

  return (
    <SearchHitCard href={href} variant={variant}>
      <Stack direction="row" spacing={isList ? 1.5 : 2} sx={{ alignItems: 'center' }}>
        <Avatar
          variant="rounded"
          src={avatarImageUrl(imageUrl, 144) ?? undefined}
          sx={{
            width: { xs: 64, sm: 72 },
            height: { xs: 64, sm: 72 },
            flexShrink: 0,
            borderRadius: 1.5,
            my: isList ? 1.15 : 0,
            bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.16 : 0.12),
            color: 'primary.main',
          }}
          aria-hidden
        >
          <FallbackIcon size={28} weight="bold" />
        </Avatar>
        <Stack spacing={0.5} sx={isList ? searchHitListTextSx(divider) : { flex: '1 1 auto', minWidth: 0 }}>
          <Typography sx={{ fontWeight: 850, fontSize: '1.125rem', color: 'text.primary' }} noWrap>
            {title}
            {verified ? (
              <Box
                component="span"
                sx={{ display: 'inline-flex', verticalAlign: 'middle', ml: 0.45, lineHeight: 0 }}
              >
                <ListingVerifiedBadge size={18} />
              </Box>
            ) : null}
            {trustBadge ? (
              <Box
                component="span"
                sx={{ display: 'inline-flex', verticalAlign: 'middle', ml: 0.45, lineHeight: 0 }}
              >
                <ListingTrustBadge size={18} />
              </Box>
            ) : null}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }} noWrap>
              {subtitle}
            </Typography>
          ) : null}
          {showPrice || bottomRight ? (
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', justifyContent: 'space-between', minWidth: 0 }}
            >
              {showPrice ? (
                <ListingPrice
                  price={price}
                  originalPrice={originalPrice}
                  currency={currency}
                  isPremium={isPremium}
                  isOkazion={isOkazion}
                  suffix={priceSuffix}
                  fontSize="0.95rem"
                  sx={{ minWidth: 0, flex: '1 1 auto' }}
                />
              ) : (
                <Box sx={{ flex: 1, minWidth: 0 }} />
              )}
              {bottomRight ? <Box sx={{ flexShrink: 0, ml: 'auto' }}>{bottomRight}</Box> : null}
            </Stack>
          ) : null}
          {showRating ? (
            <ProfessionalRatingSummary rating={ratingLabel} reviewCount={reviewCount ?? 0} starSize={14} />
          ) : null}
        </Stack>
      </Stack>
    </SearchHitCard>
  );
}

export function SearchListingCard({
  item,
  variant = 'card',
  divider = false,
}: {
  item: SearchListingItem;
  variant?: SearchHitVariant;
  divider?: boolean;
}): React.JSX.Element {
  const t = useCopy();
  const { language } = useLanguage();
  const row = { variant, divider };

  switch (item.kind) {
    case 'real-estate': {
      const { listing } = item;
      const location = [listing.zoneName, listing.cityName].filter(Boolean).join(', ');
      const transactionLabel =
        listing.transactionType === 'rent'
          ? t.common.forRent
          : listing.transactionType === 'sale'
            ? t.common.forSale
            : '';
      const categoryLabel = propertyCategoryLabel(listing.propertyCategory, language);
      return (
        <SearchListingBody
          href={listingRealEstatePublicHref(listing)}
          title={listing.title}
          subtitle={joinMeta([transactionLabel || categoryLabel, location])}
          imageUrl={listing.imageUrl}
          FallbackIcon={BuildingsIcon}
          verified={Boolean(listing.sellerVerified)}
          trustBadge={Boolean(listing.sellerTrustBadge)}
          price={listing.price}
          originalPrice={listing.originalPrice}
          currency={listing.currency}
          isPremium={Boolean(listing.isPremium)}
          isOkazion={Boolean(listing.isOkazion)}
          {...row}
        />
      );
    }
    case 'car': {
      const { listing } = item;
      const title = [listing.make, listing.model, listing.variant].filter(Boolean).join(' ');
      const typeLabel = listing.vehicleType ? vehicleTypeLabel(listing.vehicleType) : null;
      return (
        <SearchListingBody
          href={listingCarPublicHref(listing)}
          title={title}
          subtitle={joinMeta([listing.year, listing.cityName, typeLabel])}
          imageUrl={listing.imageUrl}
          FallbackIcon={CarIcon}
          verified={Boolean(listing.sellerVerified)}
          trustBadge={Boolean(listing.sellerTrustBadge)}
          price={listing.price}
          originalPrice={listing.originalPrice}
          currency={listing.currency}
          isPremium={Boolean(listing.isPremium)}
          isOkazion={Boolean(listing.isOkazion)}
          {...row}
        />
      );
    }
    case 'job': {
      const { listing } = item;
      const jobTypeLabel = findOptionLabel(JOB_TYPE_OPTIONS, listing.jobType);
      const expiresAt = listing.isOkazion
        ? listing.okazionUntil || listing.expiresAt || getJobListingExpiresAt(listing.createdAt).toISOString()
        : (listing.expiresAt ?? getJobListingExpiresAt(listing.createdAt).toISOString());
      return (
        <SearchListingBody
          href={listingJobPublicHref(listing)}
          title={listing.title}
          subtitle={joinMeta([listing.cityName, jobTypeLabel])}
          imageUrl={listing.imageUrl}
          FallbackIcon={BriefcaseIcon}
          verified={Boolean(listing.sellerVerified)}
          trustBadge={Boolean(listing.sellerTrustBadge)}
          price={listing.salary}
          currency={listing.currency}
          isPremium={Boolean(listing.isPremium)}
          isOkazion={Boolean(listing.isOkazion)}
          priceSuffix={listing.salary != null ? ' / muaj' : undefined}
          bottomRight={<JobListingCountdown expiresAt={expiresAt} variant="compact" />}
          {...row}
        />
      );
    }
    case 'marketplace': {
      const { listing } = item;
      const categoryLabel = findOptionLabel(MARKETPLACE_CATEGORY_OPTIONS, listing.category);
      return (
        <SearchListingBody
          href={listingMarketplacePublicHref(listing)}
          title={listing.title}
          subtitle={joinMeta([listing.cityName, categoryLabel])}
          imageUrl={listing.imageUrl}
          FallbackIcon={ShoppingBagIcon}
          verified={Boolean(listing.sellerVerified)}
          trustBadge={Boolean(listing.sellerTrustBadge)}
          price={listing.price}
          originalPrice={listing.originalPrice}
          currency={listing.currency}
          isPremium={Boolean(listing.isPremium)}
          isOkazion={Boolean(listing.isOkazion)}
          {...row}
        />
      );
    }
    case 'businesses':
    case 'professionals': {
      const { listing } = item;
      const href =
        item.kind === 'businesses'
          ? listingBusinessPublicHref(listing)
          : listingProfessionalPublicHref(listing);
      const location = [listing.zoneName, listing.cityName].filter(Boolean).join(', ');
      return (
        <SearchListingBody
          href={href}
          title={listing.title}
          subtitle={joinMeta([listing.categoryLabel || listing.category, location])}
          imageUrl={listing.imageUrl}
          FallbackIcon={item.kind === 'businesses' ? StorefrontIcon : HandshakeIcon}
          verified={Boolean(listing.sellerVerified)}
          trustBadge={Boolean(listing.sellerTrustBadge)}
          ratingAverage={listing.ratingAverage}
          reviewCount={listing.reviewCount}
          {...row}
        />
      );
    }
  }
}
