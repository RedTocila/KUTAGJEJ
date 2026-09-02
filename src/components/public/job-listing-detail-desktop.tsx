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
import { Box, ButtonBase, Container, Grid, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { Calendar as CalendarIcon } from '@phosphor-icons/react/dist/ssr/Calendar';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { PaperPlaneTilt as PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';

import { paths } from '@/paths';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { businessLocationLine, businessMapLocation, scrollToBusinessLocationMap } from '@/lib/google-maps-location';
import { JOB_TYPE_OPTIONS } from '@/lib/job-constants';
import {
  buildJobDetailSections,
  jobDetailMetaRows,
  type JobDetailBenefit,
} from '@/lib/job-listing-detail-content';
import { getJobListingExpiresAt } from '@/lib/job-listing-expiry';
import { jobListingCoverImageUrl } from '@/lib/job-listing-cover';
import { LISTING_DETAIL_STICKY_TOP_MD } from '@/lib/listing-detail-layout';
import type { PublicJobListing, PublicJobListingDetail } from '@/lib/public-listings-client';
import { listingHeroImageUrl } from '@/lib/storage-image';
import { JOB_LISTING_COVER_ASPECT_RATIO, JobListingFallback } from '@/components/jobs/job-listing-fallback';
import { JobListingDetailCountdown } from '@/components/public/job-listing-detail-countdown';
import { findOptionLabel, formatPrice, postedLabelSq } from '@/components/public/listing-cards/format-helpers';
import { JobCard } from '@/components/public/listing-cards/job-card';
import { ListingMediaActionButton } from '@/components/public/listing-media-action-button';
import { ListingMessageButton } from '@/components/public/listing-message-button';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { LocationMapEmbed } from '@/components/public/location-map-embed';
import { HistoryBackButton, ProductBackButton } from '@/components/public/product-browse-chrome';
import { JobVerifiedBadge } from '@/components/public/professional-listing-detail-ui';
import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { listingContactCtaSx } from '@/components/public/sticky-listing-contact';

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

function metaIcon(label: string) {
  if (label === 'Lokacioni') return LocationOnOutlined;
  if (label === 'Lloji i punës') return WorkOutlineOutlined;
  if (label === 'Gjinia e preferuar') return GroupsOutlined;
  return ScheduleOutlined;
}

export function JobListingDetailDesktop({
  listing,
  similar,
  similarSlot,
  saved,
  saveCount,
  shareCount,
  viewCount,
  onToggleSave,
  onShare,
  canonicalUrl,
  ownerPreview = false,
}: {
  listing: PublicJobListingDetail;
  similar: PublicJobListing[];
  similarSlot?: React.ReactNode;
  saved: boolean;
  saveCount: number;
  shareCount: number;
  viewCount: number;
  onToggleSave: () => void;
  onShare: () => void;
  canonicalUrl?: string;
  ownerPreview?: boolean;
}) {
  const sections = React.useMemo(() => buildJobDetailSections(listing), [listing]);
  const metaRows = React.useMemo(() => jobDetailMetaRows(listing), [listing]);
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
  const heroImage = jobListingCoverImageUrl(listing);
  const expiresAt = listing.isOkazion
    ? listing.okazionUntil || listing.expiresAt || getJobListingExpiresAt(listing.createdAt).toISOString()
    : (listing.expiresAt ?? getJobListingExpiresAt(listing.createdAt).toISOString());
  const salary =
    listing.salary != null ? `${formatPrice(listing.salary, listing.currency)} / muaj` : 'Pagë e diskutueshme';
  const locationLabel =
    businessLocationLine({
      locationAddress: listing.locationAddress,
      cityName: listing.cityName,
      zoneName: listing.zoneName,
    }) || 'Shqipëri';
  const jobTypeLabel = findOptionLabel(JOB_TYPE_OPTIONS, listing.jobType);

  if (ownerPreview) return null;

  return (
    <Box component="article" sx={{ bgcolor: 'background.default', pb: 6, display: { xs: 'none', md: 'block' } }}>
      <Container maxWidth="lg" sx={{ px: { md: 3 }, pt: 2, pb: 2 }}>
        <Stack spacing={4}>
          <Box
            sx={(theme) => ({
              width: '100%',
              borderRadius: 3,
              overflow: 'hidden',
              border: 'none',
              bgcolor: 'background.paper',
              boxShadow:
                theme.palette.mode === 'dark'
                  ? `0 20px 50px ${alpha(theme.palette.common.black, 0.35)}`
                  : '0 12px 40px rgba(0, 0, 0, 0.08)',
            })}
          >
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                aspectRatio: heroImage ? '21 / 9' : JOB_LISTING_COVER_ASPECT_RATIO,
                maxHeight: heroImage ? 360 : 240,
                minHeight: heroImage ? 240 : 160,
                overflow: 'hidden',
                bgcolor: '#000',
              }}
            >
              {heroImage ? (
                <Box
                  component="img"
                  src={listingHeroImageUrl(heroImage) ?? heroImage}
                  alt={listing.title}
                  decoding="async"
                  fetchPriority="high"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block',
                  }}
                />
              ) : (
                <JobListingFallback
                  title={listing.title}
                  industry={listing.industry}
                  requiredRoles={listing.requiredRoles}
                  cityName={listing.cityName}
                  zoneName={listing.zoneName}
                  mapsUrl={listing.mapsUrl}
                  locationAddress={listing.locationAddress}
                  locationLat={listing.locationLat}
                  locationLng={listing.locationLng}
                />
              )}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.88) 100%)',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 2,
                  pointerEvents: 'none',
                  '& [data-hero-control]': { pointerEvents: 'auto' },
                }}
              >
                <Stack
                  direction="row"
                  sx={{
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    p: { xs: 1.5, sm: 2.5 },
                  }}
                >
                  <ProductBackButton href={paths.public.jobs} aria-label="Prapa te lista e punëve" data-hero-control />
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <Box data-hero-control component="span" sx={{ display: 'inline-flex' }}>
                      <ListingMediaActionButton
                        aria-label="Ndaj njoftimin"
                        count={shareCount}
                        surface="glass"
                        icon={<PaperPlaneTiltIcon size={17} weight="bold" />}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onShare();
                        }}
                      />
                    </Box>
                    <Box data-hero-control component="span" sx={{ display: 'inline-flex' }}>
                      <ListingMediaActionButton
                        aria-label={saved ? 'Hiq nga të ruajturat' : 'Ruaj njoftimin'}
                        count={saveCount}
                        surface="glass"
                        active={saved}
                        icon={<BookmarkSimpleIcon size={17} weight={saved ? 'fill' : 'bold'} />}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onToggleSave();
                        }}
                      />
                    </Box>
                  </Stack>
                </Stack>
              </Box>
              <Stack
                spacing={1.5}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 1,
                  p: 3,
                  justifyContent: 'flex-end',
                  pointerEvents: 'none',
                }}
              >
                <Typography
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    fontSize: '2rem',
                    lineHeight: 1.15,
                    color: '#fff',
                    letterSpacing: '-0.02em',
                    maxWidth: 720,
                  }}
                >
                  {listing.title}
                  {listing.seller?.verified ? (
                    <Box
                      component="span"
                      sx={{ display: 'inline-flex', verticalAlign: 'middle', ml: 0.5, lineHeight: 0 }}
                    >
                      <JobVerifiedBadge size={22} />
                    </Box>
                  ) : null}
                </Typography>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1.35,
                      py: 0.65,
                      borderRadius: 999,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                    }}
                  >
                    <PaymentsOutlined sx={{ fontSize: 16 }} />
                    <Typography sx={{ fontWeight: 800, fontSize: '0.8125rem', lineHeight: 1 }}>{salary}</Typography>
                  </Box>
                  {jobTypeLabel ? (
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        px: 1.35,
                        py: 0.65,
                        borderRadius: 999,
                        bgcolor: 'rgba(255,255,255,0.14)',
                        color: '#fff',
                      }}
                    >
                      <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', lineHeight: 1 }}>
                        {jobTypeLabel}
                      </Typography>
                    </Box>
                  ) : null}
                </Stack>
                <Stack
                  direction="row"
                  sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1.5, width: '100%', maxWidth: 420 }}
                >
                  <Stack
                    direction="row"
                    spacing={0.55}
                    sx={{ alignItems: 'center', color: 'rgba(255,255,255,0.75)', minWidth: 0 }}
                  >
                    <CalendarIcon size={16} weight="regular" aria-hidden />
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                      {postedLabelSq(listing.createdAt)}
                    </Typography>
                  </Stack>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: 'center', color: 'rgba(255,255,255,0.75)', flexShrink: 0 }}
                  >
                    <EyeIcon size={16} weight="regular" aria-hidden />
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                      {new Intl.NumberFormat('sq-AL').format(viewCount)}
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                bgcolor: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(8px)',
                width: '100%',
              }}
            >
              {metaRows.map((row, index) => {
                const Icon = metaIcon(row.label);
                const isLocation = row.label === 'Lokacioni';
                const isFullWidth = 'fullWidth' in row && row.fullWidth;
                const content = (
                  <>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1.75,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        bgcolor: primaryMainAlpha(0.2),
                        color: 'primary.main',
                      }}
                    >
                      <Icon sx={{ fontSize: 18 }} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontWeight: 750,
                          fontSize: '0.9rem',
                          color: '#fff',
                          lineHeight: 1.2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.value}
                      </Typography>
                      <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', mt: 0.2 }}>
                        {row.label}
                      </Typography>
                    </Box>
                  </>
                );
                return (
                  <Box
                    key={row.label}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.25,
                      py: 1.75,
                      px: 2.25,
                      minWidth: 0,
                      gridColumn: isFullWidth ? '1 / -1' : undefined,
                      borderRight:
                        !isFullWidth && index < metaRows.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                      borderBottom: isFullWidth ? '1px solid rgba(255,255,255,0.08)' : 'none',
                    }}
                  >
                    {isLocation && mapLocation ? (
                      <ButtonBase
                        component="a"
                        href="#business-location-map"
                        onClick={(e) => {
                          e.preventDefault();
                          scrollToBusinessLocationMap();
                        }}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.25,
                          minWidth: 0,
                          maxWidth: '100%',
                          textAlign: 'left',
                          borderRadius: 1,
                          color: 'inherit',
                          '&:hover': { opacity: 0.9 },
                        }}
                      >
                        {content}
                      </ButtonBase>
                    ) : (
                      content
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>

          <Grid container spacing={4} sx={{ width: '100%' }}>
            <Grid size={{ md: 8 }}>
              <Stack spacing={3.5}>
                <Box
                  sx={{
                    position: 'relative',
                    pl: 2.5,
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: 6,
                      bottom: 6,
                      width: 3,
                      borderRadius: 999,
                      bgcolor: 'primary.main',
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                      mb: 1.25,
                    }}
                  >
                    Përshkrimi i punës
                  </Typography>
                  <RealEstateListingExpandableText
                    text={sections.intro}
                    readMoreLabel="Shfaq më shumë"
                    readLessLabel="Shfaq më pak"
                    fontSize="0.9rem"
                    maxLines={4}
                  />
                </Box>

                {sections.responsibilities.length > 0 ? (
                  <Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.75 }}>
                      <Box
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: 1.5,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: primaryMainAlpha(0.14),
                          color: 'primary.main',
                        }}
                      >
                        <GroupsOutlined sx={{ fontSize: 17 }} />
                      </Box>
                      <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }}>Përgjegjësitë</Typography>
                    </Stack>
                    <Grid container spacing={1.5}>
                      {sections.responsibilities.map((item, index) => (
                        <Grid key={`${index}-${item.slice(0, 24)}`} size={6}>
                          <Stack
                            direction="row"
                            spacing={1.25}
                            sx={{
                              alignItems: 'flex-start',
                              p: 1.5,
                              height: '100%',
                              borderRadius: 2.5,
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: 'background.paper',
                            }}
                          >
                            <Box
                              sx={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                display: 'grid',
                                placeItems: 'center',
                                flexShrink: 0,
                                bgcolor: 'primary.main',
                                color: 'primary.contrastText',
                                fontWeight: 800,
                                fontSize: '0.72rem',
                              }}
                            >
                              {index + 1}
                            </Box>
                            <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.5, color: 'text.secondary' }}>
                              {item}
                            </Typography>
                          </Stack>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                ) : null}

                {sections.requirements.length > 0 ? (
                  <Box
                    sx={{
                      p: 2.25,
                      borderRadius: 3,
                      border: '1px dashed',
                      borderColor: primaryMainAlpha(0.45),
                      bgcolor: primaryMainAlpha(0.05),
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                      <SchoolOutlined sx={{ fontSize: 20, color: 'primary.main' }} />
                      <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }}>Kërkesat</Typography>
                    </Stack>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {sections.requirements.map((item, index) => (
                        <Box
                          key={`${index}-${item.slice(0, 24)}`}
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'flex-start',
                            gap: 0.75,
                            maxWidth: '100%',
                            px: 1.25,
                            py: 1,
                            borderRadius: 2,
                            bgcolor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Box
                            sx={{
                              mt: 0.1,
                              width: 20,
                              height: 20,
                              borderRadius: 1,
                              display: 'grid',
                              placeItems: 'center',
                              flexShrink: 0,
                              bgcolor: primaryMainAlpha(0.16),
                              color: 'primary.main',
                              fontWeight: 800,
                              fontSize: '0.65rem',
                            }}
                          >
                            {index + 1}
                          </Box>
                          <Typography sx={{ fontSize: '0.85rem', lineHeight: 1.4 }}>{item}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ) : null}

                {sections.benefits.length > 0 ? (
                  <Box>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.72rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'text.secondary',
                        mb: 1.5,
                      }}
                    >
                      Çfarë ofrojmë
                    </Typography>
                    <Grid container spacing={1.5}>
                      {sections.benefits.map((benefit) => (
                        <Grid key={benefit.id} size={3}>
                          <Box
                            sx={{
                              p: 1.75,
                              height: '100%',
                              borderRadius: 3,
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: 'background.paper',
                              backgroundImage: `linear-gradient(160deg, ${primaryMainAlpha(0.12)} 0%, transparent 60%)`,
                            }}
                          >
                            <Box
                              sx={{
                                width: 38,
                                height: 38,
                                borderRadius: 2,
                                display: 'grid',
                                placeItems: 'center',
                                mb: 1.15,
                                bgcolor: primaryMainAlpha(0.14),
                              }}
                            >
                              {benefitIcon(benefit.id)}
                            </Box>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.35 }}>
                              {benefit.label}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                ) : null}

                {mapLocation ? (
                  <Box data-business-location-map sx={{ scrollMarginTop: 96 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', mb: 1.5 }}>Vendndodhja</Typography>
                    <LocationMapEmbed query={mapLocation.query} lat={mapLocation.lat} lng={mapLocation.lng} />
                  </Box>
                ) : null}

                {similarSlot ? (
                  similarSlot
                ) : similar.length > 0 ? (
                  <Stack spacing={2} component="aside" aria-labelledby="job-similar-heading-desktop">
                    <Typography id="job-similar-heading-desktop" sx={{ fontWeight: 800, fontSize: '1.05rem' }}>
                      Punë të ngjashme
                    </Typography>
                    <ListingsCarousel slotWidth={{ md: 300 }}>
                      {similar.map((item) => (
                        <JobCard key={item.id} listing={item} />
                      ))}
                    </ListingsCarousel>
                  </Stack>
                ) : null}

                <Box sx={{ textAlign: 'center', pt: 1 }}>
                  <HistoryBackButton href={paths.public.jobs}>Kthehu te lista e punëve</HistoryBackButton>
                </Box>
              </Stack>
            </Grid>

            <Grid size={{ md: 4 }} sx={{ alignSelf: 'stretch' }}>
              <Box sx={{ position: 'sticky', top: LISTING_DETAIL_STICKY_TOP_MD, zIndex: 1 }}>
                <Stack spacing={2} sx={{ alignItems: 'stretch', width: '100%' }}>
                  <JobListingDetailCountdown expiresAt={expiresAt} />
                  <ListingMessageButton
                    listingKind="jobs"
                    listingId={listing.id}
                    contactPhone={listing.contactPhone ?? listing.seller?.phone}
                    listingTitle={listing.title}
                    listingUrl={canonicalUrl}
                    phoneOnlyContact={listing.phoneOnlyContact}
                    variant="contained"
                    size="large"
                    disableElevation
                    fullWidth
                    sx={listingContactCtaSx}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
                    Hap bisedën me punëdhënësin në mesazhe
                  </Typography>
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}
