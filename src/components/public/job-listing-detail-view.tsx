'use client';

import * as React from 'react';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import WorkOutlineOutlined from '@mui/icons-material/WorkOutlineOutlined';
import { Avatar, Box, ButtonBase, Chip, Stack, Typography } from '@mui/material';
import { Calendar as CalendarIcon } from '@phosphor-icons/react/dist/ssr/Calendar';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';

import { paths } from '@/paths';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { businessLocationLine, businessMapLocation, scrollToBusinessLocationMap } from '@/lib/google-maps-location';
import { JOB_INDUSTRY_OPTIONS, JOB_TYPE_OPTIONS } from '@/lib/job-constants';
import {
  buildJobDetailSections,
  isJobListingNew,
  jobCompanyAvatarUrl,
  jobCompanyInitials,
  jobCoverImageUrls,
  jobDetailMetaRows,
  type JobDetailBenefit,
} from '@/lib/job-listing-detail-content';
import { getJobListingExpiresAt } from '@/lib/job-listing-expiry';
import { LISTING_DETAIL_MOBILE_HEADING_FONT_SIZE } from '@/lib/listing-detail-layout';
import { listingDetailGalleryPlaceholder } from '@/lib/listing-gallery-placeholder';
import { nextShareCount } from '@/lib/listing-metrics';
import type { ListingSharePayload } from '@/lib/listing-share';
import type { PublicJobListing, PublicJobListingDetail } from '@/lib/public-listings-client';
import { useListingBookmark } from '@/hooks/use-listing-bookmark';
import { useListingViewCount } from '@/hooks/use-listing-view-count';
import { JobListingFallback } from '@/components/jobs/job-listing-fallback';
import { JobListingDetailCountdown } from '@/components/public/job-listing-detail-countdown';
import { JobListingDetailDesktop } from '@/components/public/job-listing-detail-desktop';
import { findOptionLabel, formatPrice, postedLabelSq } from '@/components/public/listing-cards/format-helpers';
import { JobCard } from '@/components/public/listing-cards/job-card';
import { ListingDetailTitleBadges } from '@/components/public/listing-detail-title-badges';
import { ListingMetricsTracker } from '@/components/public/listing-metrics-tracker';
import { ListingSharePage } from '@/components/public/listing-share/listing-share-page';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { LocationMapEmbed } from '@/components/public/location-map-embed';
import { OwnerContactPhone } from '@/components/public/owner-contact-phone';
import { HistoryBackButton } from '@/components/public/product-browse-chrome';
import { JobVerifiedBadge } from '@/components/public/professional-listing-detail-ui';
import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { RealEstateListingGallery } from '@/components/public/real-estate-listing-gallery';
import { StickyListingContact } from '@/components/public/sticky-listing-contact';
import { OwnerEditPencil, type OwnerEditHandlers } from '@/components/user/owner-edit-pencil';
import { OwnerEditableSpot } from '@/components/user/owner-inline-edit';

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

function SoftSectionLabel({ title, edit }: { title: string; edit?: { label: string; onClick: () => void } }) {
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

function metaIcon(label: string) {
  if (label === 'Lokacioni') return LocationOnOutlined;
  if (label === 'Lloji i punës') return WorkOutlineOutlined;
  if (label === 'Gjinia e preferuar') return GroupsOutlined;
  return ScheduleOutlined;
}

export function JobListingDetailView({
  listing,
  canonicalUrl,
  similar = [],
  similarSlot,
  similarSlotDesktop,
  ownerPreview = false,
  ownerEdit,
}: {
  listing: PublicJobListingDetail;
  canonicalUrl: string;
  similar?: PublicJobListing[];
  similarSlot?: React.ReactNode;
  similarSlotDesktop?: React.ReactNode;
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
  const { viewCount, onViewed } = useListingViewCount(listing.id, listing.viewCount ?? 0);
  const [shareCount, setShareCount] = React.useState(listing.shareCount ?? 0);

  React.useEffect(() => {
    setShareCount(listing.shareCount ?? 0);
  }, [listing.id]);

  React.useEffect(() => {
    setShareCount((count) => Math.max(count, listing.shareCount ?? 0));
  }, [listing.shareCount]);

  const expiresAt = listing.isOkazion
    ? listing.okazionUntil || listing.expiresAt || getJobListingExpiresAt(listing.createdAt).toISOString()
    : (listing.expiresAt ?? getJobListingExpiresAt(listing.createdAt).toISOString());
  const sections = React.useMemo(() => buildJobDetailSections(listing), [listing]);
  const metaRows = React.useMemo(() => jobDetailMetaRows(listing), [listing]);
  const locationLine = React.useMemo(
    () =>
      businessLocationLine({
        locationAddress: listing.locationAddress,
        zoneName: listing.zoneName,
        cityName: listing.cityName,
      }),
    [listing.cityName, listing.locationAddress, listing.zoneName]
  );
  const mapLocation = React.useMemo(
    () =>
      businessMapLocation({
        locationLat: listing.locationLat,
        locationLng: listing.locationLng,
        mapsUrl: listing.mapsUrl,
        cityName: listing.cityName,
      }),
    [listing.cityName, listing.locationLat, listing.locationLng, listing.mapsUrl]
  );
  const companyName = listing.seller?.displayName?.trim() || findOptionLabel(JOB_INDUSTRY_OPTIONS, listing.industry);
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
      location: locationLine || listing.cityName || undefined,
      specs: [
        { icon: 'clock', label: jobTypeLabel },
        { icon: 'briefcase', label: industryLabel },
      ],
      createdAt: listing.createdAt,
      viewCount,
      saveCount: listing.saveCount,
      contactPhone: (listing.contactPhone ?? listing.seller?.phone)?.trim() || undefined,
      url: canonicalUrl,
    }),
    [canonicalUrl, coverImageUrls, industryLabel, jobTypeLabel, listing, locationLine, salary, viewCount]
  );

  const stickyFooterHeight = '80px';
  const scrollPadBottom = {
    xs: `calc(${stickyFooterHeight} + env(safe-area-inset-bottom, 0px))`,
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
          ownerId={listing.seller?.id}
          photoCount={coverImageUrls.filter(Boolean).length}
          onViewed={onViewed}
        />
      )}
      <JobListingDetailDesktop
        listing={listing}
        similar={ownerPreview || similarSlotDesktop ? [] : similar}
        similarSlot={ownerPreview ? undefined : similarSlotDesktop}
        saved={saved}
        saveCount={saveCount}
        shareCount={shareCount}
        viewCount={viewCount}
        onToggleSave={() => void toggleSave()}
        onShare={() => setShareOpen(true)}
        canonicalUrl={canonicalUrl}
        ownerPreview={ownerPreview}
      />

      {ownerPreview ? null : (
        <ListingSharePage
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          payload={sharePayload}
          onShared={(metrics) => setShareCount((count) => nextShareCount(count, metrics))}
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
            placeholderContent={
              <JobListingFallback
                position={listing.title}
                salary={salary}
                location={locationLine || listing.cityName}
                seed={listing.id}
              />
            }
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
                  <ListingDetailTitleBadges
                    verified={Boolean(listing.seller?.verified ?? listing.sellerVerified)}
                    verifiedLabel="Punë e verifikuar"
                    size={18}
                  />
                </Typography>
              </OwnerEditableSpot>

              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                <OwnerEditableSpot
                  field="price"
                  ownerEdit={ownerEdit}
                  label="Ndrysho pagën"
                  legacyOnClick={onEditPrice}
                >
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
                    <Typography sx={{ fontWeight: 800, fontSize: FONT_CAPTION, lineHeight: 1 }}>{salary}</Typography>
                  </Box>
                </OwnerEditableSpot>
                {jobTypeLabel || canInline || onEditSpecs ? (
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
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
                        {jobTypeLabel || 'Lloji i punës'}
                      </Typography>
                    </Box>
                    {canInline || onEditSpecs ? (
                      <OwnerEditPencil
                        label="Ndrysho llojin e punës"
                        onClick={() =>
                          ownerEdit?.onStartInlineEdit ? ownerEdit.onStartInlineEdit('specs') : onEditSpecs?.()
                        }
                      />
                    ) : null}
                  </Stack>
                ) : null}
              </Stack>

              <Stack
                direction="row"
                sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1.5, width: '100%' }}
              >
                <Stack
                  direction="row"
                  spacing={0.55}
                  sx={{ alignItems: 'center', color: 'text.secondary', minWidth: 0 }}
                >
                  <CalendarIcon size={16} weight="regular" aria-hidden />
                  <Typography sx={{ fontSize: FONT_CAPTION, color: 'text.secondary', fontWeight: 600 }}>
                    {postedLabelSq(listing.createdAt)}
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ alignItems: 'center', color: 'text.secondary', flexShrink: 0 }}
                >
                  <EyeIcon size={16} weight="regular" aria-hidden />
                  <Typography sx={{ fontSize: FONT_CAPTION, color: 'text.secondary', fontWeight: 600 }}>
                    {new Intl.NumberFormat('sq-AL').format(viewCount)}
                  </Typography>
                </Stack>
              </Stack>
              <OwnerContactPhone phone={listing.contactPhone ?? listing.seller?.phone} ownerEdit={ownerEdit} />
            </Stack>

            <Stack spacing={1} sx={{ width: '100%' }}>
              {ownerPreview ? null : (
                <StickyListingContact
                  listingKind="jobs"
                  listingId={listing.id}
                  contactPhone={listing.contactPhone ?? listing.seller?.phone}
                  listingTitle={listing.title}
                  listingUrl={canonicalUrl}
                />
              )}
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
              {ownerEdit?.editingField === 'location' && ownerEdit.inlineEditors?.location ? (
                ownerEdit.inlineEditors.location
              ) : ownerEdit?.editingField === 'specs' && ownerEdit.inlineEditors?.specs ? null : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 0.85,
                  }}
                >
                  {metaRows.map((row) => {
                    const Icon = metaIcon(row.label);
                    const isLocation = row.label === 'Lokacioni';
                    const isJobType = row.label === 'Lloji i punës';
                    const isExperience = row.label === 'Përvoja';
                    const isCandidatePreference =
                      row.label === 'Gjinia e preferuar' || row.label === 'Mosha e preferuar';
                    const locationEditClick = ownerEdit?.onStartInlineEdit
                      ? () => ownerEdit.onStartInlineEdit!('location')
                      : onEditInfo;
                    const specsClick = ownerEdit?.onStartInlineEdit
                      ? () => ownerEdit.onStartInlineEdit!('specs')
                      : onEditSpecs;
                    const rowClick = isLocation
                      ? locationEditClick
                      : isJobType || isExperience || isCandidatePreference
                        ? specsClick
                        : undefined;
                    const pencilLabel = isLocation
                      ? 'Ndrysho lokacionin'
                      : isJobType
                        ? 'Ndrysho llojin e punës'
                        : isExperience
                          ? 'Ndrysho eksperiencën'
                          : isCandidatePreference
                            ? 'Ndrysho preferencat e kandidatit'
                            : '';
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
                          gridColumn: 'fullWidth' in row && row.fullWidth ? '1 / -1' : undefined,
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
                          {isLocation && mapLocation ? (
                            <ButtonBase
                              component="a"
                              href="#business-location-map"
                              onClick={(e) => {
                                e.preventDefault();
                                scrollToBusinessLocationMap();
                              }}
                              sx={{
                                display: 'block',
                                textAlign: 'left',
                                maxWidth: '100%',
                                borderRadius: 1,
                                '&:hover .job-location-value': { color: 'primary.main' },
                              }}
                            >
                              <Typography
                                className="job-location-value"
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
                            </ButtonBase>
                          ) : (
                            <>
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
                            </>
                          )}
                        </Box>
                        {rowClick ? <OwnerEditPencil label={pencilLabel} onClick={rowClick} /> : null}
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
              {ownerEdit?.editingField === 'description' &&
              ownerEdit.inlineEditors?.description ? null : sections.intro ? (
                <RealEstateListingExpandableText
                  text={sections.intro}
                  readMoreLabel="Shfaq më shumë"
                  readLessLabel="Shfaq më pak"
                  fontSize={FONT_BODY}
                  maxLines={4}
                />
              ) : canInline || onEditInfo ? (
                <Typography sx={{ fontSize: FONT_BODY, color: 'text.secondary' }}>Shtoni përshkrimin</Typography>
              ) : null}
            </Box>

            {sections.responsibilities.length > 0 || canInline || onEditSpecs ? (
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
                  <Typography sx={{ fontWeight: 800, fontSize: FONT_SECTION, lineHeight: 1.2, flex: 1 }}>
                    Përgjegjësitë
                  </Typography>
                  {canInline || onEditSpecs ? (
                    <OwnerEditPencil
                      label="Ndrysho përgjegjësitë"
                      onClick={() =>
                        ownerEdit?.onStartInlineEdit ? ownerEdit.onStartInlineEdit('specs') : onEditSpecs?.()
                      }
                    />
                  ) : null}
                </Stack>
                {ownerEdit?.editingField === 'specs' && ownerEdit.inlineEditors?.specs ? null : sections
                    .responsibilities.length > 0 ? (
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
                ) : (
                  <Typography sx={{ fontSize: FONT_BODY, color: 'text.secondary' }}>Shtoni përgjegjësitë</Typography>
                )}
              </Box>
            ) : null}

            {sections.requirements.length > 0 || canInline || onEditSpecs ? (
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
                  <Typography sx={{ fontWeight: 800, fontSize: FONT_SECTION, lineHeight: 1.2, flex: 1 }}>
                    Kërkesat
                  </Typography>
                  {canInline || onEditSpecs ? (
                    <OwnerEditPencil
                      label="Ndrysho kërkesat"
                      onClick={() =>
                        ownerEdit?.onStartInlineEdit ? ownerEdit.onStartInlineEdit('specs') : onEditSpecs?.()
                      }
                    />
                  ) : null}
                </Stack>
                {ownerEdit?.editingField === 'specs' && ownerEdit.inlineEditors?.specs ? null : sections.requirements
                    .length > 0 ? (
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
                ) : (
                  <Typography sx={{ fontSize: FONT_BODY, color: 'text.secondary' }}>Shtoni kërkesat</Typography>
                )}
              </Box>
            ) : null}

            {sections.benefits.length > 0 || canInline || onEditSpecs ? (
              <Box>
                <SoftSectionLabel
                  title="Çfarë ofrojmë"
                  edit={
                    canInline || onEditSpecs
                      ? {
                          label: 'Ndrysho përfitimet',
                          onClick: () =>
                            ownerEdit?.onStartInlineEdit ? ownerEdit.onStartInlineEdit('specs') : onEditSpecs?.(),
                        }
                      : undefined
                  }
                />
                {ownerEdit?.editingField === 'specs' && ownerEdit.inlineEditors?.specs ? null : sections.benefits
                    .length > 0 ? (
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
                ) : (
                  <Typography sx={{ fontSize: FONT_BODY, color: 'text.secondary' }}>Shtoni përfitimet</Typography>
                )}
              </Box>
            ) : null}

            {mapLocation || canInline || onEditInfo ? (
              <Stack
                data-business-location-map
                spacing={1}
                component="section"
                aria-labelledby="job-location-heading"
                sx={{ scrollMarginTop: 80 }}
              >
                <Typography id="job-location-heading" sx={{ fontWeight: 800, fontSize: FONT_SECTION, lineHeight: 1.3 }}>
                  Vendndodhja
                </Typography>
                {mapLocation ? (
                  <LocationMapEmbed query={mapLocation.query} lat={mapLocation.lat} lng={mapLocation.lng} />
                ) : (
                  <Typography sx={{ fontSize: FONT_BODY, color: 'text.secondary' }}>
                    Shtoni qytetin ose linkun e Google Maps.
                  </Typography>
                )}
              </Stack>
            ) : null}

            {!ownerPreview && similarSlot ? (
              similarSlot
            ) : !ownerPreview && similar.length > 0 ? (
              <Stack spacing={1.5} component="aside" aria-labelledby="job-similar-heading" sx={{ mb: 0, pb: 0 }}>
                <Typography id="job-similar-heading" sx={{ fontWeight: 800, fontSize: FONT_SECTION, lineHeight: 1.3 }}>
                  Punë të ngjashme
                </Typography>
                <Box
                  sx={{
                    mx: { xs: -2, sm: 0 },
                    px: { xs: 2, sm: 0 },
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
                <HistoryBackButton href={paths.public.jobs} sx={{ fontSize: FONT_BODY }}>
                  Kthehu te lista e punëve
                </HistoryBackButton>
              </Box>
            )}
          </Stack>
        </Box>
      </Box>
    </>
  );
}
