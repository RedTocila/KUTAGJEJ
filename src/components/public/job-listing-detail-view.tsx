'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import WorkOutlineOutlined from '@mui/icons-material/WorkOutlineOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';

import { JobCard } from '@/components/public/listing-cards/job-card';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { RealEstateListingGallery } from '@/components/public/real-estate-listing-gallery';
import { JobListingDetailCountdown } from '@/components/public/job-listing-detail-countdown';
import { StickyListingContact } from '@/components/public/sticky-listing-contact';
import { findOptionLabel, formatPrice } from '@/components/public/listing-cards/format-helpers';
import { JOB_INDUSTRY_OPTIONS, JOB_TYPE_OPTIONS } from '@/lib/job-constants';
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
import { listingDetailGalleryPlaceholder } from '@/lib/listing-gallery-placeholder';
import type { PublicJobListing, PublicJobListingDetail } from '@/lib/public-listings-client';
import { JobListingDetailDesktop } from '@/components/public/job-listing-detail-desktop';
import { JobVerifiedBadge } from '@/components/public/professional-listing-detail-ui';
import { LISTING_DETAIL_MOBILE_HEADING_FONT_SIZE } from '@/lib/listing-detail-layout';
import { ListingMetricsTracker } from '@/components/public/listing-metrics-tracker';
import { ListingSharePage } from '@/components/public/listing-share/listing-share-page';
import { OwnerEditPencil, type OwnerEditHandlers } from '@/components/user/owner-edit-pencil';
import { OwnerEditableSpot } from '@/components/user/owner-inline-edit';
import { useListingBookmark } from '@/hooks/use-listing-bookmark';
import type { ListingSharePayload } from '@/lib/listing-share';
import { MOBILE_BOTTOM_NAV_OFFSET } from '@/lib/mobile-layout';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { paths } from '@/paths';

/** 14px body — standard readable size on mobile. */
const FONT_BODY = '0.875rem';
const FONT_CAPTION = '0.75rem';
const FONT_SECTION = '1rem';
const CONTENT_MAX = 480;

function benefitIcon(id: JobDetailBenefit['id']) {
  const iconSx = { fontSize: 22, color: 'primary.main' };
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

function SoftSectionLabel({
  title,
  edit,
}: {
  title: string;
  edit?: { label: string; onClick: () => void };
}) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 1.25 }}>
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: '0.72rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'text.secondary',
        }}
      >
        {title}
      </Typography>
      {edit ? <OwnerEditPencil label={edit.label} onClick={edit.onClick} /> : null}
    </Stack>
  );
}

const metaIcons = [
  LocationOnOutlined,
  WorkOutlineOutlined,
  CalendarTodayOutlined,
  ScheduleOutlined,
] as const;

export function JobListingDetailView({
  listing,
  canonicalUrl,
  similar = [],
  ownerPreview = false,
  ownerEdit,
}: {
  listing: PublicJobListingDetail;
  canonicalUrl: string;
  similar?: PublicJobListing[];
  /** Owner edit canvas — hide buyer chrome (contact, similar, metrics). */
  ownerPreview?: boolean;
  ownerEdit?: OwnerEditHandlers;
}) {
  const onEditInfo = ownerEdit?.onEditInfo;
  const onEditPrice = ownerEdit?.onEditPrice ?? onEditInfo;
  const onEditSpecs = ownerEdit?.onEditSpecs ?? onEditInfo;
  const canInline = Boolean(ownerEdit?.onStartInlineEdit);
  const { saved, saveCount, toggleSave } = useListingBookmark('job', listing.id, {
    saved: listing.saved,
    saveCount: listing.saveCount,
  });
  const [shareCount, setShareCount] = React.useState(listing.shareCount ?? 0);

  React.useEffect(() => {
    setShareCount(listing.shareCount ?? 0);
  }, [listing.shareCount]);

  const expiresAt = listing.isOkazion
    ? listing.okazionUntil || listing.expiresAt || getJobListingExpiresAt(listing.createdAt).toISOString()
    : listing.expiresAt ?? getJobListingExpiresAt(listing.createdAt).toISOString();
  const sections = React.useMemo(() => buildJobDetailSections(listing), [listing]);
  const metaRows = React.useMemo(() => jobDetailMetaRows(listing), [listing]);
  const companyName =
    listing.seller?.displayName?.trim() || findOptionLabel(JOB_INDUSTRY_OPTIONS, listing.industry);
  const coverImageUrls = React.useMemo(() => jobCoverImageUrls(listing), [listing]);
  const companyAvatarUrl = React.useMemo(() => jobCompanyAvatarUrl(listing), [listing]);
  const companyInitials = React.useMemo(() => jobCompanyInitials(companyName), [companyName]);
  const isNew = isJobListingNew(listing.createdAt);

  const [shareOpen, setShareOpen] = React.useState(false);

  const salary =
    listing.salary != null ? `${formatPrice(listing.salary, listing.currency)} / muaj` : 'Pagë e diskutueshme';
  const jobTypeLabel = findOptionLabel(JOB_TYPE_OPTIONS, listing.jobType);
  const industryLabel = findOptionLabel(JOB_INDUSTRY_OPTIONS, listing.industry);

  const sharePayload = React.useMemo<ListingSharePayload>(
    () => ({
      listingKind: 'job',
      listingId: listing.id,
      title: listing.title,
      category: industryLabel,
      priceLabel: salary,
      badge: jobTypeLabel,
      imageUrl: coverImageUrls[0] ?? listing.imageUrl ?? null,
      location: listing.cityName || undefined,
      specs: [
        { icon: 'clock', label: jobTypeLabel },
        { icon: 'briefcase', label: industryLabel },
      ],
      createdAt: listing.createdAt,
      viewCount: listing.viewCount ?? 0,
      saveCount: listing.saveCount,
      url: canonicalUrl,
    }),
    [canonicalUrl, coverImageUrls, industryLabel, jobTypeLabel, listing, salary],
  );

  const stickyFooterHeight = '80px';
  const scrollPadBottom = {
    xs: `calc(${stickyFooterHeight} + ${MOBILE_BOTTOM_NAV_OFFSET})`,
    md: `calc(${stickyFooterHeight} + env(safe-area-inset-bottom, 0px))`,
  };

  return (
    <>
      {ownerPreview ? null : (
        <ListingMetricsTracker
          listingKind="job"
          listingId={listing.id}
          city={listing.cityName}
          category={listing.industry}
        />
      )}
      <JobListingDetailDesktop
        listing={listing}
        similar={ownerPreview ? [] : similar}
        saved={saved}
        saveCount={saveCount}
        shareCount={shareCount}
        onToggleSave={() => void toggleSave()}
        onShare={() => setShareOpen(true)}
        ownerPreview={ownerPreview}
      />

      {ownerPreview ? null : (
        <ListingSharePage
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          payload={sharePayload}
          onShared={(metrics) => setShareCount(metrics.shareCount)}
        />
      )}

      <Box
        sx={{
          display: ownerPreview ? 'block' : { xs: 'block', md: 'none' },
          bgcolor: 'background.default',
          minHeight: ownerPreview ? 'auto' : '100vh',
          pb: ownerPreview ? 3 : scrollPadBottom,
          overflow: 'visible',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 0 }}>
          <RealEstateListingGallery
            title={listing.title}
            imageUrls={coverImageUrls}
            placeholderIcon={listingDetailGalleryPlaceholder(listing)}
            browseListHref={ownerPreview ? undefined : paths.public.jobs}
            browseListAriaLabel="Prapa te lista e punës"
            bookmark={ownerPreview ? undefined : { saved, onToggle: () => void toggleSave() }}
            listingKind="job"
            listingId={listing.id}
            shareCount={ownerPreview ? undefined : shareCount}
            saveCount={ownerPreview ? undefined : saveCount}
            hideSlideCount
            mediaActionSurface="glass"
            sharePayload={ownerPreview ? undefined : sharePayload}
            onEditPhotos={ownerEdit?.onEditPhotos}
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
            <Stack spacing={1} sx={{ mt: -1.5, alignItems: 'flex-start', width: '100%', overflow: 'visible' }}>
              <Stack
                direction="row"
                spacing={1.25}
                sx={{ alignItems: 'flex-end', width: '100%', position: 'relative', zIndex: 2 }}
              >
                <Avatar
                  src={companyAvatarUrl ?? undefined}
                  alt={companyName}
                  sx={{
                    width: 64,
                    height: 64,
                    flexShrink: 0,
                    mt: -4.5,
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

                <Box sx={{ flex: 1, minWidth: 0, pb: 0.25 }}>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.55,
                        minWidth: 0,
                        maxWidth: '100%',
                        px: 1.15,
                        py: 0.55,
                        borderRadius: 999,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 750,
                          fontSize: FONT_CAPTION,
                          color: 'text.primary',
                          lineHeight: 1.2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {companyName}
                      </Typography>
                      {listing.seller?.verified ? <JobVerifiedBadge size={16} /> : null}
                    </Box>
                    {isNew ? (
                      <Chip
                        label="E re"
                        size="small"
                        sx={{
                          ml: 'auto',
                          flexShrink: 0,
                          height: 24,
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          color: 'primary.contrastText',
                          bgcolor: 'rgba(166, 226, 46, 0.78)',
                          border: '1px solid rgba(255,255,255,0.35)',
                          backdropFilter: 'blur(14px) saturate(160%)',
                          WebkitBackdropFilter: 'blur(14px) saturate(160%)',
                          boxShadow: '0 4px 14px rgba(166, 226, 46, 0.28), inset 0 1px 0 rgba(255,255,255,0.4)',
                          '& .MuiChip-label': { px: 1.1 },
                        }}
                      />
                    ) : null}
                  </Stack>
                </Box>
              </Stack>

              <OwnerEditableSpot
                field="title"
                ownerEdit={ownerEdit}
                label="Ndrysho titullin"
                legacyOnClick={onEditInfo}
                align="flex-start"
              >
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
              </OwnerEditableSpot>

              <OwnerEditableSpot
                field="price"
                ownerEdit={ownerEdit}
                label="Ndrysho pagën"
                legacyOnClick={onEditPrice}
              >
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1.15,
                      py: 0.55,
                      borderRadius: 999,
                      bgcolor: primaryMainAlpha(0.14),
                      color: 'primary.main',
                    }}
                  >
                    <PaymentsOutlined sx={{ fontSize: 15 }} />
                    <Typography sx={{ fontWeight: 800, fontSize: FONT_CAPTION, lineHeight: 1 }}>
                      {salary}
                    </Typography>
                  </Box>
                  {jobTypeLabel ? (
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        px: 1.15,
                        py: 0.55,
                        borderRadius: 999,
                        border: '1px solid',
                        borderColor: 'divider',
                        color: 'text.secondary',
                      }}
                    >
                      <Typography sx={{ fontWeight: 700, fontSize: FONT_CAPTION, lineHeight: 1 }}>
                        {jobTypeLabel}
                      </Typography>
                    </Box>
                  ) : null}
                </Stack>
              </OwnerEditableSpot>

              {listing.seller ? (
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <LockOutlined sx={{ fontSize: 14, color: 'text.disabled' }} />
                  <Typography sx={{ fontSize: FONT_CAPTION, color: 'text.disabled' }}>
                    Kjo punë është e verifikuar dhe e sigurt
                  </Typography>
                </Stack>
              ) : null}
            </Stack>

            <Stack spacing={1}>
              <OwnerEditableSpot
                field="specs"
                ownerEdit={ownerEdit}
                label="Ndrysho detajet"
                legacyOnClick={onEditSpecs}
              >
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                  }}
                >
                  Detaje
                </Typography>
              </OwnerEditableSpot>
              {ownerEdit?.editingField === 'location' && ownerEdit.inlineEditors?.location
                ? ownerEdit.inlineEditors.location
                : ownerEdit?.editingField === 'specs' && ownerEdit.inlineEditors?.specs
                  ? null
                  : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 0.85,
              }}
            >
              {metaRows.map((row, index) => {
                const Icon = metaIcons[index];
                const isLocation = index === 0;
                const locationClick = ownerEdit?.onStartInlineEdit
                  ? () => ownerEdit.onStartInlineEdit!('location')
                  : onEditInfo;
                return (
                  <Box
                    key={row.label}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1.15,
                      py: 1,
                      borderRadius: 2.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      minWidth: 0,
                    }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1.5,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        bgcolor: primaryMainAlpha(0.14),
                        color: 'primary.main',
                      }}
                    >
                      <Icon sx={{ fontSize: 17 }} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        sx={{
                          fontWeight: 750,
                          fontSize: '0.78rem',
                          lineHeight: 1.2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.value}
                      </Typography>
                      <Typography
                        sx={{
                          color: 'text.secondary',
                          fontSize: '0.65rem',
                          lineHeight: 1.2,
                          mt: 0.2,
                        }}
                      >
                        {row.label}
                      </Typography>
                    </Box>
                    {isLocation && locationClick ? (
                      <OwnerEditPencil label="Ndrysho lokacionin" onClick={locationClick} />
                    ) : null}
                  </Box>
                );
              })}
            </Box>
                  )}
            </Stack>

            <JobListingDetailCountdown expiresAt={expiresAt} />

            <Box
              sx={{
                position: 'relative',
                pl: 2,
                py: 0.25,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 4,
                  bottom: 4,
                  width: 3,
                  borderRadius: 999,
                  bgcolor: 'primary.main',
                },
              }}
            >
              <OwnerEditableSpot
                field="description"
                ownerEdit={ownerEdit}
                label="Ndrysho përshkrimin"
                legacyOnClick={onEditInfo}
                sx={{ mb: 1.25 }}
              >
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                  }}
                >
                  Përshkrimi i punës
                </Typography>
              </OwnerEditableSpot>
              {ownerEdit?.editingField === 'description' && ownerEdit.inlineEditors?.description ? null : sections.intro ? (
                <RealEstateListingExpandableText
                  text={sections.intro}
                  readMoreLabel="Shfaq më shumë"
                  readLessLabel="Shfaq më pak"
                  fontSize={FONT_BODY}
                  maxLines={4}
                />
              ) : canInline || onEditInfo ? (
                <Typography sx={{ fontSize: FONT_BODY, color: 'text.secondary' }}>
                  Shtoni përshkrimin
                </Typography>
              ) : null}
            </Box>

            {sections.responsibilities.length > 0 ? (
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 1.5,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: primaryMainAlpha(0.14),
                      color: 'primary.main',
                    }}
                  >
                    <GroupsOutlined sx={{ fontSize: 16 }} />
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: FONT_SECTION, lineHeight: 1.2 }}>
                    Përgjegjësitë
                  </Typography>
                </Stack>
                <Stack spacing={0} sx={{ position: 'relative', pl: 0.5 }}>
                  {sections.responsibilities.map((item, index) => {
                    const isLast = index === sections.responsibilities.length - 1;
                    return (
                      <Stack
                        key={`${index}-${item.slice(0, 24)}`}
                        direction="row"
                        spacing={1.25}
                        sx={{ alignItems: 'stretch', position: 'relative' }}
                      >
                        <Box
                          sx={{
                            width: 28,
                            flexShrink: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                          }}
                        >
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              display: 'grid',
                              placeItems: 'center',
                              bgcolor: 'primary.main',
                              color: 'primary.contrastText',
                              fontWeight: 800,
                              fontSize: '0.7rem',
                              zIndex: 1,
                            }}
                          >
                            {index + 1}
                          </Box>
                          {isLast ? null : (
                            <Box
                              sx={{
                                flex: 1,
                                width: 2,
                                my: 0.35,
                                bgcolor: primaryMainAlpha(0.35),
                                borderRadius: 1,
                              }}
                            />
                          )}
                        </Box>
                        <Box
                          sx={{
                            flex: 1,
                            minWidth: 0,
                            mb: isLast ? 0 : 1.25,
                            p: 1.35,
                            borderRadius: 2.25,
                            bgcolor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Typography sx={{ fontSize: FONT_BODY, lineHeight: 1.5, color: 'text.secondary' }}>
                            {item}
                          </Typography>
                        </Box>
                      </Stack>
                    );
                  })}
                </Stack>
              </Box>
            ) : null}

            {sections.requirements.length > 0 ? (
              <Box
                sx={{
                  p: 1.75,
                  borderRadius: 3,
                  border: '1px dashed',
                  borderColor: primaryMainAlpha(0.45),
                  bgcolor: primaryMainAlpha(0.05),
                }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.35 }}>
                  <SchoolOutlined sx={{ fontSize: 18, color: 'primary.main' }} />
                  <Typography sx={{ fontWeight: 800, fontSize: FONT_SECTION, lineHeight: 1.2 }}>
                    Kërkesat
                  </Typography>
                </Stack>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.85 }}>
                  {sections.requirements.map((item, index) => (
                    <Box
                      key={`${index}-${item.slice(0, 24)}`}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'flex-start',
                        gap: 0.65,
                        maxWidth: '100%',
                        px: 1.15,
                        py: 0.85,
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box
                        sx={{
                          mt: 0.15,
                          width: 18,
                          height: 18,
                          borderRadius: 1,
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          bgcolor: primaryMainAlpha(0.16),
                          color: 'primary.main',
                          fontWeight: 800,
                          fontSize: '0.62rem',
                        }}
                      >
                        {index + 1}
                      </Box>
                      <Typography sx={{ fontSize: '0.8125rem', lineHeight: 1.4, color: 'text.primary' }}>
                        {item}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : null}

            {sections.benefits.length > 0 ? (
              <Box>
                <SoftSectionLabel title="Çfarë ofrojmë" />
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    overflowX: 'auto',
                    pb: 0.5,
                    mx: -2,
                    px: 2,
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                  }}
                >
                  {sections.benefits.map((benefit) => (
                    <Box
                      key={benefit.id}
                      sx={{
                        flex: '0 0 auto',
                        width: 148,
                        p: 1.5,
                        borderRadius: 3,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        backgroundImage: `linear-gradient(160deg, ${primaryMainAlpha(0.12)} 0%, transparent 60%)`,
                      }}
                    >
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 2,
                          display: 'grid',
                          placeItems: 'center',
                          mb: 1.1,
                          bgcolor: primaryMainAlpha(0.14),
                        }}
                      >
                        {benefitIcon(benefit.id)}
                      </Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', lineHeight: 1.35 }}>
                        {benefit.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : null}

            {!ownerPreview && similar.length > 0 ? (
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

            {ownerPreview ? null : (
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
            )}
          </Stack>
        </Box>

        {ownerPreview ? null : <StickyListingContact listingKind="jobs" listingId={listing.id} />}
      </Box>
    </>
  );
}
