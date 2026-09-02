'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { PaperPlaneTilt as PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';

import { listingJobPublicHref, paths } from '@/paths';
import { resolveJobCardRoles } from '@/lib/job-card-roles';
import { getJobListingExpiresAt } from '@/lib/job-listing-expiry';
import { resolveJobCoverIcon } from '@/lib/job-industry-icons';
import { nextSaveCount, nextShareCount, toggleListingSave } from '@/lib/listing-metrics';
import type { ListingSharePayload } from '@/lib/listing-share';
import {
  JOB_INDUSTRY_OPTIONS,
  JOB_TYPE_OPTIONS,
  WORK_LOCATION_OPTIONS,
} from '@/lib/job-constants';
import type { PublicJobListing } from '@/lib/public-listings-client';
import { useSavedListingsOptional } from '@/contexts/saved-listings-context';
import { useListingSaveCount, useListingSavedState } from '@/hooks/use-listing-saved-state';
import { useUser } from '@/hooks/use-user';
import { ListingCardLink } from '@/components/public/listing-card-link';
import { ListingMediaActionButton } from '@/components/public/listing-media-action-button';
import { ListingPremiumBadge } from '@/components/public/listing-premium-badge';
import { ListingSharePage } from '@/components/public/listing-share/listing-share-page';
import { ListingVerifiedBadge } from '@/components/public/professional-listing-detail-ui';

import { CardShell } from './card-shell';
import { findOptionLabel, formatPrice, listingCardRelativeDate } from './format-helpers';
import type { ListingCardRatingSummary } from './listing-card-rating';
import { OkazionCountdownPlaceholder } from './okazion-countdown';
import { JobListingCountdownPlaceholder } from './job-listing-countdown';

const OkazionCountdown = dynamic(() => import('./okazion-countdown').then((m) => m.OkazionCountdown), {
  ssr: false,
  loading: () => <OkazionCountdownPlaceholder />,
});

const JobListingCountdown = dynamic(
  () => import('./job-listing-countdown').then((m) => m.JobListingCountdown),
  {
    ssr: false,
    loading: () => <JobListingCountdownPlaceholder variant="default" />,
  }
);

function JobCardTag({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: compact ? 1 : 1.2,
        py: compact ? 0.3 : 0.45,
        borderRadius: 999,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        color: 'text.secondary',
        fontSize: compact ? '0.68rem' : '0.75rem',
        fontWeight: 600,
        lineHeight: 1.2,
        maxWidth: '100%',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {children}
    </Box>
  );
}

function JobCardActions({
  listing,
  sharePayload,
  compact = false,
}: {
  listing: PublicJobListing;
  sharePayload: ListingSharePayload;
  compact?: boolean;
}) {
  const router = useRouter();
  const { user } = useUser();
  const savedCtx = useSavedListingsOptional();
  const saved = useListingSavedState('job', listing.id, listing.saved);
  const cachedSaveCount = useListingSaveCount('job', listing.id, listing.saveCount ?? 0, saved);
  const [shareCount, setShareCount] = React.useState(listing.shareCount ?? 0);
  const [localSaveCount, setLocalSaveCount] = React.useState(listing.saveCount ?? 0);
  const [shareOpen, setShareOpen] = React.useState(false);

  const saveCount = savedCtx ? cachedSaveCount : localSaveCount;

  React.useEffect(() => {
    setShareCount(listing.shareCount ?? 0);
    setLocalSaveCount(listing.saveCount ?? 0);
  }, [listing.id, listing.saveCount, listing.shareCount]);

  const handleShare = React.useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setShareOpen(true);
  }, []);

  const handleSave = React.useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!user) {
        router.push(paths.user.auth);
        return;
      }
      const wasSaved = saved;
      setLocalSaveCount((count) => Math.max(0, count + (wasSaved ? -1 : 1)));

      if (savedCtx) {
        await savedCtx.toggleSaved('job', listing.id, { fromCount: saveCount });
        return;
      }
      const metrics = await toggleListingSave('job', listing.id);
      if (metrics) setLocalSaveCount((count) => nextSaveCount(count, metrics));
      else setLocalSaveCount((count) => Math.max(0, count + (wasSaved ? 1 : -1)));
    },
    [listing.id, router, saveCount, saved, savedCtx, user]
  );

  return (
    <>
      <Stack direction="row" spacing={compact ? 0.5 : 0.75} sx={{ alignItems: 'center', flexShrink: 0 }}>
        <ListingMediaActionButton
          aria-label="Ndaj njoftimin"
          count={shareCount}
          compact={compact}
          icon={<PaperPlaneTiltIcon size={17} weight="bold" />}
          onClick={handleShare}
        />
        <ListingMediaActionButton
          aria-label={saved ? 'Hiq nga të ruajturat' : 'Ruaj njoftimin'}
          count={saveCount}
          active={saved}
          accent="primary"
          compact={compact}
          icon={<BookmarkSimpleIcon size={17} weight={saved ? 'fill' : 'bold'} />}
          onClick={handleSave}
        />
      </Stack>
      {shareOpen ? (
        <ListingSharePage
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          payload={sharePayload}
          onShared={(metrics) => setShareCount((count) => nextShareCount(count, metrics))}
        />
      ) : null}
    </>
  );
}

function JobCardRoleBullets({
  roles,
  fontSize,
  bulletSize,
  twoColumns = false,
}: {
  roles: string[];
  fontSize: string;
  bulletSize: number;
  twoColumns?: boolean;
}) {
  const items = roles.map((role, index) => (
    <Stack
      component="li"
      key={`${role}-${index}`}
      direction="row"
      spacing={0.65}
      sx={{ alignItems: 'flex-start', minWidth: 0 }}
    >
      <Box
        aria-hidden
        sx={{
          width: bulletSize,
          height: bulletSize,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          flexShrink: 0,
          mt: '0.48em',
          opacity: 0.9,
        }}
      />
      <Typography
        sx={{
          fontSize,
          lineHeight: 1.35,
          fontWeight: 700,
          color: 'text.secondary',
          minWidth: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {role}
      </Typography>
    </Stack>
  ));

  if (twoColumns) {
    return (
      <Box
        component="ul"
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 0.55,
          columnGap: 1.1,
          m: 0,
          p: 0,
          listStyle: 'none',
        }}
      >
        {items}
      </Box>
    );
  }

  return (
    <Stack component="ul" spacing={0.5} sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {items}
    </Stack>
  );
}

function jobCardSnippet(listing: PublicJobListing, salaryLabel: string, locationLabel: string): string {
  const description = String(listing.description ?? '').replace(/\s+/g, ' ').trim();
  if (description) return description;
  if (locationLabel) return `Pozicion i hapur në ${locationLabel}.`;
  return `${salaryLabel}.`;
}

type JobCardVariant = 'default' | 'cover' | 'compact' | 'carousel' | 'homepage';

export function JobCard({
  listing,
  sellerRating: _sellerRating = null,
  imagePriority: _imagePriority = false,
  variant = 'default',
  locationInPriceRow: _locationInPriceRow = false,
}: {
  listing: PublicJobListing;
  sellerRating?: ListingCardRatingSummary | null;
  imagePriority?: boolean;
  variant?: JobCardVariant;
  locationInPriceRow?: boolean;
}) {
  const compact = variant === 'compact';
  const carousel = variant === 'carousel';
  const homepage = variant === 'homepage';
  const dense = compact || carousel;
  const mixedHome = homepage || carousel;
  const industryLabel = findOptionLabel(JOB_INDUSTRY_OPTIONS, listing.industry);
  const jobTypeLabel = findOptionLabel(JOB_TYPE_OPTIONS, listing.jobType);
  const workLocationLabel = findOptionLabel(WORK_LOCATION_OPTIONS, listing.workLocation);
  const locationLabel = [listing.zoneName, listing.cityName].filter(Boolean).join(', ');
  const salaryLabel =
    listing.salary != null ? `${formatPrice(listing.salary, listing.currency)} / muaj` : 'Pagë e diskutueshme';
  const viewCount = listing.viewCount ?? 0;
  const postedLabel = listingCardRelativeDate(listing);
  const requiredRoles = resolveJobCardRoles(listing);
  const snippet = jobCardSnippet(listing, salaryLabel, locationLabel);
  const CoverIcon = resolveJobCoverIcon(listing.title, listing.industry);
  const employerLabel = industryLabel || 'Punë';

  const tags = [
    jobTypeLabel,
    locationLabel || workLocationLabel,
    listing.salary != null ? salaryLabel : null,
  ].filter(Boolean) as string[];
  const visibleTags = mixedHome ? tags.slice(0, 2) : tags;

  const sharePayload = React.useMemo<ListingSharePayload>(
    () => ({
      listingKind: 'job',
      listingId: listing.id,
      title: listing.title,
      category: industryLabel,
      priceLabel: salaryLabel,
      badge: jobTypeLabel,
      imageUrl: listing.imageUrl ?? null,
      location: locationLabel || listing.cityName || undefined,
      specs: [
        { icon: 'clock', label: jobTypeLabel },
        { icon: 'briefcase', label: industryLabel },
      ],
      createdAt: listing.createdAt,
      viewCount,
      saveCount: listing.saveCount,
      contactPhone: listing.contactPhone?.trim() || undefined,
      url: listingJobPublicHref(listing),
    }),
    [
      industryLabel,
      jobTypeLabel,
      listing.contactPhone,
      listing.createdAt,
      listing.id,
      listing.imageUrl,
      listing.cityName,
      listing.saveCount,
      listing.title,
      locationLabel,
      salaryLabel,
      viewCount,
    ]
  );

  const eyeSize = homepage ? 13 : carousel ? 12 : compact ? 13 : 14;
  const roleFontSize = homepage ? '0.9rem' : carousel ? '0.82rem' : compact ? '0.84rem' : '0.92rem';
  const roleBulletSize = homepage ? 6 : carousel ? 5.5 : compact ? 5 : 6;
  const roleTwoColumns = requiredRoles.length >= 3;
  const jobExpiresAt = listing.isOkazion
    ? listing.okazionUntil || listing.expiresAt || getJobListingExpiresAt(listing.createdAt).toISOString()
    : (listing.expiresAt ?? getJobListingExpiresAt(listing.createdAt).toISOString());

  return (
    <ListingCardLink
      listingKind="job"
      listingId={listing.id}
      href={listingJobPublicHref(listing)}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
    >
      <CardShell
        compact={compact}
        premium={Boolean(listing.isPremium)}
        okazion={Boolean(listing.isOkazion)}
      >
        <Stack
          className="listing-card-body"
          spacing={homepage ? 1.35 : carousel ? 1 : compact ? 1.1 : 1.5}
          sx={{
            p: homepage
              ? { xs: 1.5, sm: 1.65 }
              : carousel
                ? { xs: 1.35, sm: 1.5 }
                : compact
                  ? { xs: 1.35, sm: 1.5 }
                  : { xs: 1.75, sm: 2 },
            height: '100%',
            minHeight: mixedHome ? { xs: 318, md: 332 } : compact ? 0 : 280,
          }}
        >
          <Stack
            direction="row"
            spacing={homepage ? 1 : carousel ? 0.9 : 1.1}
            sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
          >
            <Stack
              direction="row"
              spacing={homepage ? 1 : carousel ? 0.9 : 1.1}
              sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}
            >
              <Box
                sx={{
                  width: homepage ? 38 : carousel ? 32 : compact ? 36 : 40,
                  height: homepage ? 38 : carousel ? 32 : compact ? 36 : 40,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  color: 'primary.main',
                  '& svg': {
                    width: homepage ? 19 : carousel ? 16 : compact ? 18 : 20,
                    height: homepage ? 19 : carousel ? 16 : compact ? 18 : 20,
                  },
                }}
              >
                <CoverIcon weight="duotone" />
              </Box>
              <Stack direction="row" spacing={0.55} sx={{ alignItems: 'center', minWidth: 0, flexWrap: 'wrap' }}>
                <Typography
                  noWrap
                  sx={{
                    fontWeight: 700,
                    fontSize: homepage ? '0.8rem' : carousel ? '0.74rem' : compact ? '0.78rem' : '0.84rem',
                    color: 'text.secondary',
                    maxWidth: '100%',
                  }}
                >
                  {employerLabel}
                </Typography>
                {listing.sellerVerified ? (
                  <ListingVerifiedBadge size={homepage ? 13 : carousel ? 12 : compact ? 13 : 14} />
                ) : null}
                {listing.isPremium && !listing.isOkazion ? (
                  <ListingPremiumBadge size={homepage ? 18 : carousel ? 16 : compact ? 18 : 20} aria-label="Premium" />
                ) : null}
              </Stack>
            </Stack>
            <JobCardActions listing={listing} sharePayload={sharePayload} compact={dense} />
          </Stack>

          <Typography
            component="h3"
            sx={{
              fontWeight: 800,
              fontSize: homepage ? '0.98rem' : carousel ? '0.88rem' : compact ? '0.95rem' : { xs: '1.08rem', sm: '1.15rem' },
              lineHeight: 1.25,
              letterSpacing: '-0.02em',
              color: 'text.primary',
              display: '-webkit-box',
              WebkitLineClamp: homepage ? 3 : carousel || compact ? 2 : 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {listing.title}
          </Typography>

          {visibleTags.length > 0 ? (
            <Stack
              direction="row"
              spacing={0.65}
              sx={{ alignItems: 'center', flexWrap: 'wrap', gap: homepage ? 0.65 : 0.55 }}
            >
              {visibleTags.map((tag) => (
                <JobCardTag key={tag} compact={dense && !homepage}>
                  {tag}
                </JobCardTag>
              ))}
            </Stack>
          ) : null}

          <Stack spacing={0.75} sx={{ flex: homepage ? '0 0 auto' : carousel ? '1 1 auto' : compact ? '0 0 auto' : '1 1 auto' }}>
            <Box
              sx={(theme) => ({
                p: homepage ? 1.15 : carousel ? 1 : compact ? 1.1 : 1.35,
                borderRadius: homepage ? 2 : carousel ? 1.5 : 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.03) : alpha(theme.palette.common.black, 0.02),
                minHeight: homepage ? 0 : carousel ? 52 : compact ? 0 : 72,
              })}
            >
              {requiredRoles.length > 0 ? (
                <JobCardRoleBullets
                  roles={requiredRoles}
                  fontSize={roleFontSize}
                  bulletSize={roleBulletSize}
                  twoColumns={roleTwoColumns}
                />
              ) : (
                <Typography
                  sx={{
                    fontStyle: 'italic',
                    fontSize: roleFontSize,
                    lineHeight: 1.45,
                    color: 'text.secondary',
                    display: '-webkit-box',
                    WebkitLineClamp: homepage || carousel || compact ? 2 : 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {snippet}
                </Typography>
              )}
            </Box>

            {listing.isOkazion ? (
              <OkazionCountdown expiresAt={listing.okazionUntil} compact={dense && !homepage} />
            ) : (
              <JobListingCountdown expiresAt={jobExpiresAt} variant="default" condensed={dense && !homepage} />
            )}
          </Stack>

          {homepage ? <Box sx={{ flex: 1, minHeight: 4 }} /> : !dense ? <Box sx={{ flex: 1, minHeight: 8 }} /> : null}

          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ fontSize: homepage ? '0.72rem' : carousel ? '0.68rem' : compact ? '0.72rem' : undefined }}
            >
              {postedLabel}
            </Typography>
            <Stack direction="row" spacing={0.45} sx={{ alignItems: 'center', color: 'text.disabled', flexShrink: 0 }}>
              <EyeIcon size={eyeSize} weight="regular" />
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ fontSize: homepage ? '0.72rem' : carousel ? '0.68rem' : compact ? '0.7rem' : undefined }}
              >
                {new Intl.NumberFormat('en-GB').format(viewCount)}
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </CardShell>
    </ListingCardLink>
  );
}
