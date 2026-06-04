'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import ArrowForwardOutlined from '@mui/icons-material/ArrowForwardOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import WorkOutlineOutlined from '@mui/icons-material/WorkOutlineOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';

import { JobCard } from '@/components/public/listing-cards/job-card';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { RealEstateListingGallery } from '@/components/public/real-estate-listing-gallery';
import { JobListingDetailCountdown } from '@/components/public/job-listing-detail-countdown';
import { findOptionLabel, formatPrice } from '@/components/public/listing-cards/format-helpers';
import { JOB_INDUSTRY_OPTIONS } from '@/lib/job-constants';
import { getJobListingExpiresAt } from '@/lib/job-listing-expiry';
import {
  buildJobDetailSections,
  isJobListingNew,
  jobCompanyAvatarUrl,
  jobCompanyInitials,
  jobCoverImageUrls,
  jobDetailMetaRows,
  type JobDetailBenefit,
} from '@/lib/job-listing-detail-content';
import { whatsappHref } from '@/lib/listing-contact';
import { listingDetailGalleryPlaceholder } from '@/lib/listing-gallery-placeholder';
import type { PublicJobListing, PublicJobListingDetail } from '@/lib/public-listings-client';
import { JobListingDetailDesktop } from '@/components/public/job-listing-detail-desktop';
import { JobVerifiedBadge } from '@/components/public/professional-listing-detail-ui';
import { LISTING_DETAIL_MOBILE_HEADING_FONT_SIZE } from '@/lib/listing-detail-layout';
import { ListingMetricsTracker } from '@/components/public/listing-metrics-tracker';
import { useListingBookmark } from '@/hooks/use-listing-bookmark';
import { recordListingMetricEvent } from '@/lib/listing-metrics';
import { MOBILE_BOTTOM_NAV_OFFSET } from '@/lib/mobile-layout';
import { paths } from '@/paths';

/** 14px body — standard readable size on mobile. */
const FONT_BODY = '0.875rem';
const FONT_CAPTION = '0.75rem';
const FONT_SECTION = '1rem';
const CONTENT_MAX = 480;

const surfaceCardSx = {
  p: 2,
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'rgba(var(--mui-palette-background-paperChannel) / 0.45)',
} as const;

function benefitIcon(id: JobDetailBenefit['id']) {
  const iconSx = { fontSize: 28, color: 'primary.main' };
  switch (id) {
    case 'pay':
    case 'negotiable-pay':
      return <PaymentsOutlined sx={iconSx} />;
    case 'growth':
      return <TrendingUpOutlined sx={iconSx} />;
    case 'health':
      return <ShieldOutlined sx={iconSx} />;
    default:
      return <ScheduleOutlined sx={iconSx} />;
  }
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
      <Box sx={{ color: 'primary.main', display: 'flex', '& svg': { fontSize: 22 } }}>{icon}</Box>
      <Typography sx={{ fontWeight: 800, fontSize: FONT_SECTION, lineHeight: 1.3 }}>{title}</Typography>
    </Stack>
  );
}

function BulletList({
  items,
  variant,
}: {
  items: string[];
  variant: 'check' | 'dot';
}) {
  return (
    <Stack component="ul" spacing={1.25} sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {items.map((item) => (
        <Stack
          key={item}
          component="li"
          direction="row"
          spacing={1}
          sx={{ alignItems: 'flex-start' }}
        >
          {variant === 'check' ? (
            <CheckCircleOutlined sx={{ fontSize: 18, color: 'primary.main', mt: 0.15, flexShrink: 0 }} />
          ) : (
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                mt: 0.6,
                flexShrink: 0,
              }}
            />
          )}
          <Typography component="span" sx={{ fontSize: FONT_BODY, lineHeight: 1.5, color: 'text.secondary' }}>
            {item}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

export function JobListingDetailView({
  listing,
  canonicalUrl,
  similar = [],
}: {
  listing: PublicJobListingDetail;
  canonicalUrl: string;
  similar?: PublicJobListing[];
}) {
  const { saved, saveCount, toggleSave } = useListingBookmark('job', listing.id, {
    saved: listing.saved,
    saveCount: listing.saveCount,
  });
  const [shareCount, setShareCount] = React.useState(listing.shareCount ?? 0);

  React.useEffect(() => {
    setShareCount(listing.shareCount ?? 0);
  }, [listing.shareCount]);

  const expiresAt = listing.expiresAt ?? getJobListingExpiresAt(listing.createdAt).toISOString();
  const sections = React.useMemo(() => buildJobDetailSections(listing), [listing]);
  const metaRows = React.useMemo(() => jobDetailMetaRows(listing), [listing]);
  const companyName =
    listing.seller?.displayName?.trim() || findOptionLabel(JOB_INDUSTRY_OPTIONS, listing.industry);
  const phone = listing.contactPhone ?? listing.seller?.phone ?? null;
  const applyHref = phone ? `tel:${phone.replace(/\s/g, '')}` : whatsappHref(listing.contactPhone ?? listing.seller?.phone);
  const coverImageUrls = React.useMemo(() => jobCoverImageUrls(listing), [listing]);
  const companyAvatarUrl = React.useMemo(() => jobCompanyAvatarUrl(listing), [listing]);
  const companyInitials = React.useMemo(() => jobCompanyInitials(companyName), [companyName]);
  const isNew = isJobListingNew(listing.createdAt);

  const metaIcons = [
    LocationOnOutlined,
    WorkOutlineOutlined,
    CalendarTodayOutlined,
    ScheduleOutlined,
  ] as const;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: listing.title, text: listing.title, url: canonicalUrl });
      } else {
        await navigator.clipboard.writeText(canonicalUrl);
      }
    } catch {
      /* noop */
    }
    const metrics = await recordListingMetricEvent('job', listing.id, 'share');
    if (metrics) setShareCount(metrics.shareCount);
  };

  /** Sticky Ruaj/Apliko bar — safe-area counted once via nav offset on mobile. */
  const stickyFooterHeight = '96px';
  const scrollPadBottom = {
    xs: `calc(${stickyFooterHeight} + ${MOBILE_BOTTOM_NAV_OFFSET})`,
    md: `calc(${stickyFooterHeight} + env(safe-area-inset-bottom, 0px))`,
  };

  return (
    <>
      <ListingMetricsTracker listingKind="job" listingId={listing.id} />
      <JobListingDetailDesktop
        listing={listing}
        similar={similar}
        saved={saved}
        saveCount={saveCount}
        shareCount={shareCount}
        onToggleSave={() => void toggleSave()}
        onShare={() => void handleShare()}
        applyHref={applyHref}
      />

      <Box
        sx={{
          display: { xs: 'block', md: 'none' },
          bgcolor: 'background.default',
          minHeight: '100vh',
          pb: scrollPadBottom,
          overflow: 'visible',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 0 }}>
        <RealEstateListingGallery
          title={listing.title}
          imageUrls={coverImageUrls}
          placeholderIcon={listingDetailGalleryPlaceholder(listing)}
          browseListHref={paths.public.jobs}
          browseListAriaLabel="Prapa te lista e punës"
          bookmark={{ saved, onToggle: () => void toggleSave() }}
          listingKind="job"
          listingId={listing.id}
          shareCount={shareCount}
          saveCount={saveCount}
          hideSlideCount
          mediaActionSurface="glass"
        />
        </Box>

      <Box
        sx={{
          px: 2,
          pb: 0,
          maxWidth: CONTENT_MAX,
          mx: 'auto',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 2,
          overflow: 'visible',
        }}
      >
        <Stack spacing={2} sx={{ minWidth: 0, width: '100%', overflow: 'visible' }}>
          <Stack spacing={0.75} sx={{ mt: -1.5, alignItems: 'flex-start', width: '100%', overflow: 'visible' }}>
            <Stack
              direction="row"
              spacing={1.25}
              sx={{ alignItems: 'center', width: '100%', position: 'relative', zIndex: 2 }}
            >
              <Avatar
                src={companyAvatarUrl ?? undefined}
                alt={companyName}
                sx={{
                  width: 72,
                  height: 72,
                  flexShrink: 0,
                  mt: -5.5,
                  border: '3px solid',
                  borderColor: 'background.default',
                  bgcolor: 'grey.900',
                  color: 'primary.main',
                  fontWeight: 800,
                  fontSize: FONT_BODY,
                }}
              >
                {companyInitials}
              </Avatar>

              {isNew ? (
                <Chip
                  label="E re"
                  size="small"
                  color="primary"
                  sx={{ height: 24, fontSize: FONT_CAPTION, fontWeight: 700, ml: 'auto', mt: -1.25 }}
                />
              ) : null}
            </Stack>

            <Typography
              component="h1"
              sx={{
                fontWeight: 800,
                fontSize: LISTING_DETAIL_MOBILE_HEADING_FONT_SIZE,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
              }}
            >
              {listing.title}
            </Typography>

            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Box
                sx={{
                  width: 'max-content',
                  flexShrink: 0,
                  height: 24,
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: 1.25,
                  borderRadius: 999,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: FONT_CAPTION,
                    lineHeight: 1,
                    color: 'inherit',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {companyName}
                </Typography>
              </Box>
              {listing.seller?.verified ? <JobVerifiedBadge size={20} /> : null}
            </Stack>

            {listing.seller ? (
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                <LockOutlined sx={{ fontSize: 14, color: 'text.disabled' }} />
                <Typography sx={{ fontSize: FONT_CAPTION, color: 'text.disabled' }}>
                  Kjo punë është e verifikuar dhe e sigurt
                </Typography>
              </Stack>
            ) : null}
          </Stack>

          {/* Meta — single row */}
          <Grid
            container
            sx={{
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'rgba(var(--mui-palette-background-paperChannel) / 0.55)',
              overflow: 'hidden',
            }}
          >
            {metaRows.map((row, index) => {
              const Icon = metaIcons[index];
              return (
                <Grid
                  key={row.label}
                  size={3}
                  sx={{
                    py: 1.25,
                    px: 0.75,
                    minWidth: 0,
                    borderRight: index < metaRows.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                  }}
                >
                  <Stack spacing={0.35} sx={{ minWidth: 0, alignItems: 'center', textAlign: 'center' }}>
                    <Icon sx={{ fontSize: 18, color: 'primary.main' }} />
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.6875rem',
                        lineHeight: 1.25,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {row.value}
                    </Typography>
                    <Typography
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.625rem',
                        lineHeight: 1.2,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {row.label}
                    </Typography>
                  </Stack>
                </Grid>
              );
            })}
          </Grid>

          <JobListingDetailCountdown expiresAt={expiresAt} />

          {/* Description */}
          <Box sx={surfaceCardSx}>
            <SectionHeader icon={<DescriptionOutlined />} title="Përshkrimi i punës" />
            <RealEstateListingExpandableText
              text={sections.intro}
              readMoreLabel="Lexo më shumë"
              readLessLabel="Mbyll"
              fontSize={FONT_BODY}
            />
            {listing.salary != null ? (
              <Typography sx={{ mt: 1.5, color: 'primary.main', fontWeight: 700, fontSize: FONT_BODY }}>
                Pagë: {formatPrice(listing.salary, listing.currency)} / muaj
              </Typography>
            ) : null}
          </Box>

          {/* Responsibilities — full width, stacked above requirements */}
          <Box sx={surfaceCardSx}>
            <SectionHeader icon={<GroupsOutlined />} title="Përgjegjësitë kryesore" />
            <BulletList items={sections.responsibilities} variant="check" />
          </Box>

          <Box sx={surfaceCardSx}>
            <SectionHeader icon={<SchoolOutlined />} title="Kërkesat" />
            <BulletList items={sections.requirements} variant="dot" />
          </Box>

          {/* Benefits 2×2 */}
          <Box sx={surfaceCardSx}>
            <SectionHeader icon={<EventAvailableOutlined />} title="Çfarë ofrojmë" />
            <Grid container spacing={2}>
              {sections.benefits.map((benefit) => (
                <Grid key={benefit.id} size={6}>
                  <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center', px: 0.5 }}>
                    {benefitIcon(benefit.id)}
                    <Typography sx={{ fontWeight: 600, fontSize: FONT_BODY, lineHeight: 1.35 }}>
                      {benefit.label}
                    </Typography>
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </Box>

          {similar.length > 0 ? (
            <Stack
              spacing={1.5}
              component="aside"
              aria-labelledby="job-similar-heading"
              sx={{ mb: 0, pb: 0 }}
            >
              <Typography id="job-similar-heading" sx={{ fontWeight: 800, fontSize: FONT_SECTION, lineHeight: 1.3 }}>
                Punë të ngjashme
              </Typography>
              <Box
                sx={{
                  mx: { xs: -2, sm: 0 },
                  mb: 0,
                  '& > div > div': { py: '8px 0 0 !important' },
                }}
              >
                <ListingsCarousel slotWidth={{ xs: 260, sm: 280, md: 300 }}>
                  {similar.map((item) => (
                    <JobCard key={item.id} listing={item} />
                  ))}
                </ListingsCarousel>
              </Box>
            </Stack>
          ) : null}

          <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'center' }}>
            <Button
              component={Link}
              href={paths.public.jobs}
              variant="text"
              sx={{ fontWeight: 700, textTransform: 'none', fontSize: FONT_BODY }}
            >
              Kthehu te lista e punëve
            </Button>
          </Box>
        </Stack>
      </Box>

      {/* Sticky footer */}
      <Box
        sx={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: { xs: MOBILE_BOTTOM_NAV_OFFSET, md: 0 },
          zIndex: 25,
          px: 2,
          pt: 1.5,
          pb: 1.5,
          bgcolor: 'rgba(var(--mui-palette-background-defaultChannel) / 0.96)',
          backdropFilter: 'blur(14px)',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack spacing={1} sx={{ maxWidth: 560, mx: 'auto', width: '100%' }}>
          <Stack direction="row" spacing={1.25}>
            <Button
              variant="outlined"
              onClick={toggleSave}
              startIcon={<BookmarkSimpleIcon size={18} weight={saved ? 'fill' : 'regular'} />}
              sx={{
                flex: 1,
                py: 1.25,
                borderRadius: 2.5,
                fontWeight: 800,
                textTransform: 'none',
                fontSize: FONT_BODY,
                borderWidth: 2,
                ...(saved
                  ? { borderColor: 'primary.main', color: 'primary.main' }
                  : {}),
              }}
            >
              Ruaj
            </Button>
            {applyHref ? (
              <Button
                component="a"
                href={applyHref}
                variant="contained"
                endIcon={<ArrowForwardOutlined />}
                sx={{
                  flex: 1.35,
                  py: 1.25,
                  borderRadius: 2.5,
                  fontWeight: 800,
                  textTransform: 'none',
                  fontSize: FONT_BODY,
                  boxShadow: 'none',
                }}
              >
                Apliko tani
              </Button>
            ) : (
              <Button
                variant="contained"
                disabled
                sx={{ flex: 1.35, py: 1.25, borderRadius: 2.5, textTransform: 'none', fontSize: FONT_BODY }}
              >
                Apliko tani
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>
    </Box>
    </>
  );
}
