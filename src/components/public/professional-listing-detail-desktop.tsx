'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Hammer as HammerIcon } from '@phosphor-icons/react/dist/ssr/Hammer';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { PaintBrush as PaintBrushIcon } from '@phosphor-icons/react/dist/ssr/PaintBrush';
import { Ruler as RulerIcon } from '@phosphor-icons/react/dist/ssr/Ruler';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';

import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { BusinessPromoBanner } from '@/components/public/listing-cards/business-promo-banner';
import { ListingMessageButton } from '@/components/public/listing-message-button';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { RealEstateListingGallery } from '@/components/public/real-estate-listing-gallery';
import { listingContactCtaSx } from '@/components/public/sticky-listing-contact';
import {
  ProfessionalPortfolioSection,
  ProfessionalRatingSummary,
  ProfessionalVerifiedBadge,
} from '@/components/public/professional-listing-detail-ui';
import { ListingTrustBadge } from '@/components/public/listing-trust-badge';
import { listingDetailGalleryPlaceholder } from '@/lib/listing-gallery-placeholder';
import {
  LISTING_DETAIL_HERO_GALLERY_MAX_WIDTH_PX,
  LISTING_DETAIL_HERO_IMAGE_SIZES,
} from '@/lib/listing-detail-layout';
import {
  professionalAvatarUrl,
  professionalCoverImageUrls,
  professionalDisplayName,
  professionalInitials,
  professionalPortfolioItems,
  professionalRatingDisplay,
  professionalServiceTags,
  professionalSubtitle,
} from '@/lib/professional-listing-detail-content';
import type { PublicDirectoryListing, PublicDirectoryListingDetail } from '@/lib/public-listings-client';
import {
  ProfessionalReviewSection,
  type ProfessionalReviewStats,
} from '@/components/professionals/professional-review-section';
import { paths } from '@/paths';
import { useRouter } from 'next/navigation';
import { productPanelSx } from '@/styles/product-sx';

const surfaceSx = {
  ...productPanelSx,
  p: 2.5,
} as const;

const SERVICE_TAG_ICONS = [HammerIcon, PaintBrushIcon, RulerIcon, SparkleIcon, BriefcaseIcon] as const;

export function ProfessionalListingDetailDesktop({
  listing,
  similar,
  saved,
  saveCount,
  onToggleSave,
  ownerPreview = false,
}: {
  listing: PublicDirectoryListingDetail;
  similar: PublicDirectoryListing[];
  saved: boolean;
  saveCount: number;
  onToggleSave: () => void;
  /** Kept for call-site compatibility / future share overrides. */
  canonicalUrl?: string;
  ownerPreview?: boolean;
}) {
  const displayName = React.useMemo(() => professionalDisplayName(listing), [listing]);
  const subtitle = React.useMemo(() => professionalSubtitle(listing), [listing]);
  const [liveReviewStats, setLiveReviewStats] = React.useState<ProfessionalReviewStats | null>(null);
  const rating = React.useMemo(
    () =>
      professionalRatingDisplay(
        liveReviewStats
          ? { ...listing, ratingAverage: liveReviewStats.ratingAverage, reviewCount: liveReviewStats.reviewCount }
          : listing,
      ),
    [listing, liveReviewStats],
  );
  const onReviewStatsChange = React.useCallback((stats: ProfessionalReviewStats) => {
    setLiveReviewStats(stats);
  }, []);
  const serviceTags = React.useMemo(() => professionalServiceTags(listing), [listing]);
  const portfolio = React.useMemo(() => professionalPortfolioItems(listing), [listing]);
  const coverImageUrls = React.useMemo(() => professionalCoverImageUrls(listing), [listing]);
  const avatarUrl = React.useMemo(() => professionalAvatarUrl(listing), [listing]);
  const router = useRouter();
  const initials = React.useMemo(() => professionalInitials(listing), [listing]);

  const locationLine = listing.cityName ? `${listing.cityName}, Shqipëri` : null;
  const isVerified = Boolean(listing.seller?.verified);

  if (ownerPreview) return null;

  return (
    <Box component="article" sx={{ bgcolor: 'background.default', pb: 6, display: { xs: 'none', md: 'block' } }}>
      <Container maxWidth="lg" sx={{ px: { md: 3 }, pt: 2, pb: 2 }}>
        <Stack spacing={4}>
            <Box
              sx={(theme) => ({
              width: '100%',
              borderRadius: 2.5,
              overflow: 'hidden',
              bgcolor: 'background.paper',
              boxShadow:
                theme.palette.mode === 'dark'
                  ? `0 20px 50px ${alpha(theme.palette.common.black, 0.35)}`
                  : '0 12px 40px rgba(0, 0, 0, 0.08)',
            })}
            >
            <Stack direction="row" sx={{ alignItems: 'stretch', minHeight: 0, width: '100%' }}>
              <Box
                sx={{
                  flex: `1 1 ${LISTING_DETAIL_HERO_GALLERY_MAX_WIDTH_PX}px`,
                  maxWidth: LISTING_DETAIL_HERO_GALLERY_MAX_WIDTH_PX,
                  minWidth: 0,
                  width: '100%',
                  overflow: 'hidden',
                }}
              >
                <RealEstateListingGallery
                  title={displayName}
                  imageUrls={coverImageUrls}
                  placeholderIcon={listingDetailGalleryPlaceholder(listing)}
                  browseListHref={paths.public.professionals}
                  browseListAriaLabel="Prapa te lista e profesionistëve"
                  heroSizes={LISTING_DETAIL_HERO_IMAGE_SIZES}
                  listingKind="professionals"
                  listingId={listing.id}
                  shareCount={listing.shareCount}
                  saveCount={saveCount}
                  bookmark={{ saved, onToggle: onToggleSave }}
                  hideSlideCount
                />
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: '0 0 auto',
                  width: 'min(400px, 36%)',
                  minWidth: 320,
                  maxWidth: 420,
                  bgcolor: 'background.paper',
                  p: 2.5,
                }}
              >
                <Stack spacing={2.25} sx={{ width: '100%' }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                    <Avatar
                      src={avatarUrl ?? undefined}
                      alt={displayName}
                      sx={{
                        width: 64,
                        height: 64,
                        bgcolor: 'grey.900',
                        color: 'primary.main',
                        fontWeight: 800,
                      }}
                    >
                      {initials}
                    </Avatar>
                    <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0, maxWidth: '100%' }}>
                        <Typography
                          component="h1"
                          sx={{
                            fontWeight: 800,
                            fontSize: '1.35rem',
                            lineHeight: 1.2,
                            minWidth: 0,
                            flex: '0 1 auto',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {displayName}
                          {isVerified ? (
                            <Box
                              component="span"
                              sx={{ display: 'inline-flex', verticalAlign: 'middle', ml: 0.5, lineHeight: 0 }}
                            >
                              <ProfessionalVerifiedBadge />
                            </Box>
                          ) : null}
                          {listing.seller?.trustBadge ? (
                            <Box
                              component="span"
                              sx={{ display: 'inline-flex', verticalAlign: 'middle', ml: 0.5, lineHeight: 0 }}
                            >
                              <ListingTrustBadge size={22} />
                            </Box>
                          ) : null}
                        </Typography>
                      </Stack>
                      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>{subtitle}</Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}
                      >
                        {locationLine ? (
                          <Stack
                            direction="row"
                            spacing={0.5}
                            sx={{ alignItems: 'center', color: 'text.secondary', minWidth: 0, flex: 1 }}
                          >
                            <MapPinIcon size={15} weight="regular" color="var(--mui-palette-primary-main)" />
                            <Typography
                              sx={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {locationLine}
                            </Typography>
                          </Stack>
                        ) : (
                          <Box sx={{ flex: 1 }} />
                        )}
                        <Box sx={{ flexShrink: 0 }}>
                          <ProfessionalRatingSummary
                            rating={rating.rating}
                            reviewCount={rating.reviews}
                            starSize={16}
                            showReviewLabel
                          />
                        </Box>
                      </Stack>
                    </Stack>
                  </Stack>

                  <Divider />

                  {listing.announcementTitle?.trim() ? (
                    <BusinessPromoBanner
                      title={listing.announcementTitle}
                      subtitle={listing.announcementSubtitle}
                      bannerUrl={listing.announcementBannerUrl}
                      variant="detail"
                    />
                  ) : null}

                  <Stack spacing={1.25} sx={{ alignItems: 'stretch', width: '100%' }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%' }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <ListingMessageButton
                          listingKind="professionals"
                          listingId={listing.id}
                          label="Kontakto"
                          variant="contained"
                          disableElevation
                          size="large"
                          fullWidth
                          sx={listingContactCtaSx}
                        />
                      </Box>
                      <IconButton
                        aria-label={saved ? 'Hiq nga të ruajturat' : 'Ruaj'}
                        onClick={onToggleSave}
                        sx={{
                          border: '2px solid',
                          borderColor: saved ? 'primary.main' : 'divider',
                          borderRadius: 2.5,
                          width: 52,
                          height: 52,
                          flexShrink: 0,
                          color: saved ? 'primary.main' : 'text.primary',
                        }}
                      >
                        <BookmarkSimpleIcon size={20} weight={saved ? 'fill' : 'regular'} />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Stack>
              </Box>
            </Stack>
          </Box>

          <Grid container spacing={3}>
            <Grid size={{ md: 8 }}>
              <Stack spacing={3}>
                {listing.description ? (
                  <Box sx={surfaceSx}>
                    <Typography sx={{ fontWeight: 800, fontSize: '1rem', mb: 1.5 }}>Rreth profesionistit</Typography>
                    <RealEstateListingExpandableText text={listing.description} fontSize="0.9rem" />
                  </Box>
                ) : null}

                {serviceTags.length > 0 ? (
                  <Box sx={surfaceSx}>
                    <Typography sx={{ fontWeight: 800, fontSize: '1rem', mb: 1.5 }}>Shërbimet e mia</Typography>
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                      {serviceTags.map((tag, index) => {
                        const TagIcon = SERVICE_TAG_ICONS[index % SERVICE_TAG_ICONS.length]!;
                        return (
                          <Chip
                            key={tag}
                            icon={<TagIcon size={14} weight="duotone" color="var(--mui-palette-primary-main)" />}
                            label={tag}
                            variant="outlined"
                            sx={{ fontWeight: 700, borderRadius: 2, borderColor: 'divider' }}
                          />
                        );
                      })}
                    </Stack>
                  </Box>
                ) : null}

                {portfolio.length > 0 ? (
                  <Box sx={surfaceSx}>
                    <ProfessionalPortfolioSection
                      items={portfolio}
                      listingId={listing.id}
                      listingKind="professionals"
                    />
                  </Box>
                ) : null}
              </Stack>
            </Grid>

            <Grid size={{ md: 4 }}>
              <Box sx={surfaceSx}>
                <ProfessionalReviewSection
                  listingId={listing.id}
                  ratingAverage={listing.ratingAverage}
                  reviewCount={listing.reviewCount}
                  onStatsChange={onReviewStatsChange}
                  onReviewSubmitted={() => router.refresh()}
                />
              </Box>
            </Grid>
          </Grid>

          {similar.length > 0 ? (
            <Stack spacing={1.5}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }}>Profesionistë të ngjashëm</Typography>
              <ListingsCarousel slotWidth={{ md: 320 }}>
                {similar.map((item) => (
                  <DirectoryListingCard key={item.id} listing={item} />
                ))}
              </ListingsCarousel>
            </Stack>
          ) : null}

          <Box sx={{ textAlign: 'center' }}>
            <Button component={Link} href={paths.public.professionals} variant="text" sx={{ fontWeight: 700, textTransform: 'none' }}>
              Kthehu te lista e profesionistëve
            </Button>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
