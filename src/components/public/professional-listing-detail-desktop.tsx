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
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { Clock as ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { CurrencyEur as CurrencyEurIcon } from '@phosphor-icons/react/dist/ssr/CurrencyEur';
import { Hammer as HammerIcon } from '@phosphor-icons/react/dist/ssr/Hammer';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { PaintBrush as PaintBrushIcon } from '@phosphor-icons/react/dist/ssr/PaintBrush';
import { Ruler as RulerIcon } from '@phosphor-icons/react/dist/ssr/Ruler';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { WhatsappLogo as WhatsappLogoIcon } from '@phosphor-icons/react/dist/ssr/WhatsappLogo';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';

import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { RealEstateListingGallery } from '@/components/public/real-estate-listing-gallery';
import { whatsappOutlinedButtonSx } from '@/components/public/whatsapp-outlined-button-sx';
import {
  ProfessionalFiveStarRating,
  ProfessionalMetaStat,
  ProfessionalPortfolioSection,
  ProfessionalRatingSummary,
  ProfessionalReviewsSectionHeader,
  ProfessionalVerifiedBadge,
  professionalMetaStatCellSx,
} from '@/components/public/professional-listing-detail-ui';
import { listingDetailGalleryPlaceholder } from '@/lib/listing-gallery-placeholder';
import { whatsappHref } from '@/lib/listing-contact';
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
  professionalPriceFromLine,
  professionalRatingDisplay,
  professionalResponseTime,
  professionalServiceTags,
  professionalSubtitle,
} from '@/lib/professional-listing-detail-content';
import type { PublicDirectoryListing, PublicDirectoryListingDetail } from '@/lib/public-listings-client';
import { ProfessionalReviewSection } from '@/components/professionals/professional-review-section';
import { paths } from '@/paths';
import { useRouter } from 'next/navigation';

const surfaceSx = {
  p: 2.5,
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'rgba(var(--mui-palette-background-paperChannel) / 0.55)',
} as const;

const SERVICE_TAG_ICONS = [HammerIcon, PaintBrushIcon, RulerIcon, SparkleIcon, BriefcaseIcon] as const;

export function ProfessionalListingDetailDesktop({
  listing,
  similar,
  saved,
  saveCount,
  onToggleSave,
  canonicalUrl,
}: {
  listing: PublicDirectoryListingDetail;
  similar: PublicDirectoryListing[];
  saved: boolean;
  saveCount: number;
  onToggleSave: () => void;
  canonicalUrl: string;
}) {
  const displayName = React.useMemo(() => professionalDisplayName(listing), [listing]);
  const subtitle = React.useMemo(() => professionalSubtitle(listing), [listing]);
  const rating = React.useMemo(() => professionalRatingDisplay(listing), [listing]);
  const responseTime = React.useMemo(() => professionalResponseTime(listing), [listing]);
  const priceFrom = React.useMemo(() => professionalPriceFromLine(listing), [listing]);
  const serviceTags = React.useMemo(() => professionalServiceTags(listing), [listing]);
  const portfolio = React.useMemo(() => professionalPortfolioItems(listing), [listing]);
  const coverImageUrls = React.useMemo(() => professionalCoverImageUrls(listing), [listing]);
  const avatarUrl = React.useMemo(() => professionalAvatarUrl(listing), [listing]);
  const router = useRouter();
  const initials = React.useMemo(() => professionalInitials(listing), [listing]);

  const phone = listing.contactPhone ?? listing.seller?.phone ?? null;
  const telHref = phone ? `tel:${phone.replace(/\s/g, '')}` : null;
  const wa = whatsappHref(phone);
  const whatsappInquireHref = wa
    ? `${wa}?text=${encodeURIComponent(`Përshëndetje, jam i interesuar për shërbimet tuaja «${displayName}» (${canonicalUrl}).`)}`
    : undefined;

  const locationLine = listing.cityName ? `${listing.cityName}, Shqipëri` : null;
  const isVerified = Boolean(listing.seller?.verified);

  return (
    <Box component="article" sx={{ bgcolor: 'background.default', pb: 6, display: { xs: 'none', md: 'block' } }}>
      <Container maxWidth="lg" sx={{ px: { md: 3 }, pt: 2, pb: 2 }}>
        <Stack spacing={4}>
          <Box
            sx={(theme) => ({
              width: '100%',
              borderRadius: 3,
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
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0, width: '100%' }}>
                        <Typography
                          component="h1"
                          sx={{
                            fontWeight: 800,
                            fontSize: '1.35rem',
                            lineHeight: 1.2,
                            minWidth: 0,
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {displayName}
                        </Typography>
                        {isVerified ? <ProfessionalVerifiedBadge /> : null}
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
                        {rating.rating ? (
                          <ProfessionalRatingSummary
                            rating={rating.rating}
                            reviewCount={rating.reviews}
                            starSize={16}
                            showReviewLabel
                          />
                        ) : null}
                      </Stack>
                    </Stack>
                  </Stack>

                  <Divider />

                  <Grid container sx={{ overflow: 'hidden' }}>
                    <Grid size={4} sx={professionalMetaStatCellSx(0, 3)}>
                      <ProfessionalMetaStat
                        icon={BriefcaseIcon}
                        label="Specializimi"
                        value={listing.categoryLabel}
                        iconSize={22}
                      />
                    </Grid>
                    {responseTime ? (
                      <Grid size={4} sx={professionalMetaStatCellSx(1, 3)}>
                        <ProfessionalMetaStat
                          icon={ClockIcon}
                          label="Përgjigjet shpejt"
                          value={responseTime}
                          iconSize={22}
                        />
                      </Grid>
                    ) : null}
                    <Grid size={4} sx={professionalMetaStatCellSx(2, 3)}>
                      <ProfessionalMetaStat icon={CurrencyEurIcon} label="Çmimi nga" value={priceFrom} iconSize={22} />
                    </Grid>
                  </Grid>

                  <Stack spacing={1.25}>
                    {telHref ? (
                      <>
                        <Stack direction="row" spacing={1}>
                          <Button
                            component="a"
                            href={telHref}
                            variant="contained"
                            startIcon={<ChatsCircleIcon weight="regular" size={22} />}
                            sx={{
                              flex: 1,
                              py: 1.25,
                              borderRadius: 999,
                              fontWeight: 800,
                              textTransform: 'none',
                              boxShadow: 'none',
                              color: 'grey.900',
                            }}
                          >
                            Kontakto profesionistin
                          </Button>
                          <IconButton
                            aria-label={saved ? 'Hiq nga të ruajturat' : 'Ruaj'}
                            onClick={onToggleSave}
                            sx={{
                              border: '2px solid',
                              borderColor: saved ? 'primary.main' : 'divider',
                              borderRadius: 999,
                              width: 48,
                              height: 48,
                              flexShrink: 0,
                              color: saved ? 'primary.main' : 'text.primary',
                            }}
                          >
                            <BookmarkSimpleIcon size={20} weight={saved ? 'fill' : 'regular'} />
                          </IconButton>
                        </Stack>
                        {whatsappInquireHref ? (
                          <Button
                            component="a"
                            href={whatsappInquireHref}
                            rel="noopener noreferrer"
                            target="_blank"
                            variant="outlined"
                            fullWidth
                            startIcon={<WhatsappLogoIcon weight="regular" size={22} />}
                            sx={{
                              py: 1.25,
                              borderRadius: 2,
                              fontWeight: 800,
                              textTransform: 'none',
                              ...whatsappOutlinedButtonSx,
                            }}
                          >
                            WhatsApp
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <Button variant="contained" disabled fullWidth sx={{ borderRadius: 999, py: 1.25 }}>
                        Nr. kontakti i padisponueshëm
                      </Button>
                    )}
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
                            sx={{ fontWeight: 700, borderColor: 'divider' }}
                          />
                        );
                      })}
                    </Stack>
                  </Box>
                ) : null}

                {portfolio.length > 0 ? (
                  <Box sx={surfaceSx}>
                    <ProfessionalPortfolioSection items={portfolio} />
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
