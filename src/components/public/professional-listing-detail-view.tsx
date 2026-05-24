'use client';

import * as React from 'react';
import Image from 'next/image';
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
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';
import { WhatsappLogo as WhatsappLogoIcon } from '@phosphor-icons/react/dist/ssr/WhatsappLogo';

import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { RealEstateListingGallery } from '@/components/public/real-estate-listing-gallery';
import { whatsappOutlinedButtonSx } from '@/components/public/whatsapp-outlined-button-sx';
import { ProfessionalListingDetailDesktop } from '@/components/public/professional-listing-detail-desktop';
import {
  ProfessionalRatingBadge,
  ProfessionalReviewsSectionHeader,
  ProfessionalVerifiedBadge,
} from '@/components/public/professional-listing-detail-ui';
import { listingDetailGalleryPlaceholder } from '@/lib/listing-gallery-placeholder';
import { whatsappHref } from '@/lib/listing-contact';
import { MOBILE_BOTTOM_NAV_OFFSET } from '@/lib/mobile-layout';
import {
  professionalAvatarUrl,
  professionalCoverImageUrls,
  professionalDisplayName,
  professionalInitials,
  professionalPortfolioItems,
  professionalPriceFromLine,
  professionalRatingDisplay,
  professionalResponseTime,
  professionalReviews,
  professionalServiceTags,
  professionalSubtitle,
} from '@/lib/professional-listing-detail-content';
import type { PublicDirectoryListing, PublicDirectoryListingDetail } from '@/lib/public-listings-client';
import { paths } from '@/paths';

const SAVED_PROFESSIONALS_KEY = 'kutagjej-saved-professionals';

const FONT_BODY = '0.875rem';
const FONT_CAPTION = '0.75rem';
const CONTENT_MAX = 480;

const surfaceSx = {
  p: 2,
  borderRadius: 3,
  bgcolor: 'rgba(var(--mui-palette-background-paperChannel) / 0.55)',
  border: '1px solid',
  borderColor: 'divider',
} as const;

const SERVICE_TAG_ICONS = [HammerIcon, PaintBrushIcon, RulerIcon, SparkleIcon, BriefcaseIcon] as const;

function MetaStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BriefcaseIcon;
  label: string;
  value: string;
}) {
  return (
    <Stack spacing={0.5} sx={{ minWidth: 0, alignItems: 'flex-start' }}>
      <Icon size={18} weight="duotone" color="var(--mui-palette-primary-main)" aria-hidden />
      <Typography
        sx={{
          fontSize: '0.6875rem',
          color: 'text.secondary',
          fontWeight: 600,
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: FONT_CAPTION,
          lineHeight: 1.25,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <Stack direction="row" spacing={0.25} aria-label={`${rating} yje`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon
          key={i}
          size={14}
          weight={i < rating ? 'fill' : 'regular'}
          color={i < rating ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-text-disabled)'}
        />
      ))}
    </Stack>
  );
}

export function ProfessionalListingDetailView({
  listing,
  canonicalUrl,
  similar = [],
}: {
  listing: PublicDirectoryListingDetail;
  canonicalUrl: string;
  similar?: PublicDirectoryListing[];
}) {
  const [saved, setSaved] = React.useState(false);

  const displayName = React.useMemo(() => professionalDisplayName(listing), [listing]);
  const subtitle = React.useMemo(() => professionalSubtitle(listing), [listing]);
  const rating = React.useMemo(() => professionalRatingDisplay(listing), [listing]);
  const responseTime = React.useMemo(() => professionalResponseTime(listing), [listing]);
  const priceFrom = React.useMemo(() => professionalPriceFromLine(listing), [listing]);
  const serviceTags = React.useMemo(() => professionalServiceTags(listing), [listing]);
  const portfolio = React.useMemo(() => professionalPortfolioItems(listing), [listing]);
  const coverImageUrls = React.useMemo(() => professionalCoverImageUrls(listing), [listing]);
  const reviews = React.useMemo(() => professionalReviews(listing), [listing]);
  const avatarUrl = React.useMemo(() => professionalAvatarUrl(listing), [listing]);
  const initials = React.useMemo(() => professionalInitials(listing), [listing]);

  const phone = listing.contactPhone ?? listing.seller?.phone ?? null;
  const telHref = phone ? `tel:${phone.replace(/\s/g, '')}` : null;
  const wa = whatsappHref(phone);
  const whatsappInquireHref = wa
    ? `${wa}?text=${encodeURIComponent(`Përshëndetje, jam i interesuar për shërbimet tuaja «${displayName}» (${canonicalUrl}).`)}`
    : undefined;

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_PROFESSIONALS_KEY);
      const ids: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      setSaved(ids.includes(listing.id));
    } catch {
      /* noop */
    }
  }, [listing.id]);

  const toggleSave = () => {
    try {
      const raw = localStorage.getItem(SAVED_PROFESSIONALS_KEY);
      const ids = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
      if (ids.has(listing.id)) ids.delete(listing.id);
      else ids.add(listing.id);
      localStorage.setItem(SAVED_PROFESSIONALS_KEY, JSON.stringify([...ids]));
      setSaved(ids.has(listing.id));
    } catch {
      /* noop */
    }
  };

  const stickyFooterHeight = '76px';
  const scrollPadBottom = {
    xs: `calc(${stickyFooterHeight} + ${MOBILE_BOTTOM_NAV_OFFSET})`,
    md: `calc(${stickyFooterHeight} + env(safe-area-inset-bottom, 0px))`,
  };

  const locationLine = listing.cityName ? `${listing.cityName}, Shqipëri` : null;
  const isVerified = Boolean(listing.seller);

  return (
    <>
      <ProfessionalListingDetailDesktop
        listing={listing}
        similar={similar}
        saved={saved}
        onToggleSave={toggleSave}
        canonicalUrl={canonicalUrl}
      />

      <Box sx={{ display: { xs: 'block', md: 'none' }, bgcolor: 'background.default', minHeight: '100vh', pb: scrollPadBottom }}>
        <Box sx={{ position: 'relative' }}>
          <RealEstateListingGallery
            title={displayName}
            imageUrls={coverImageUrls}
            placeholderIcon={listingDetailGalleryPlaceholder(listing)}
            browseListHref={paths.public.professionals}
            browseListAriaLabel="Prapa te lista e profesionistëve"
            bookmark={{ saved, onToggle: toggleSave }}
            hideSlideCount
          />
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 28,
              zIndex: 2,
              px: 2,
              maxWidth: CONTENT_MAX,
              mx: 'auto',
              width: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              justifyContent: 'flex-end',
              pointerEvents: 'none',
              '& > *': { pointerEvents: 'auto' },
            }}
          >
            <ProfessionalRatingBadge rating={rating.rating} reviewCount={rating.reviews} />
          </Box>
        </Box>

        <Box sx={{ px: 2, maxWidth: CONTENT_MAX, mx: 'auto', width: '100%', boxSizing: 'border-box' }}>
          <Stack spacing={2.5} sx={{ pt: 0, pb: 3 }}>
            {/* Profile — avatar left; title block starts at content edge */}
            <Stack spacing={0.75} sx={{ mt: -1.5, alignItems: 'flex-start', width: '100%' }}>
              <Avatar
                src={avatarUrl ?? undefined}
                alt={displayName}
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
                {initials}
              </Avatar>

              <Stack spacing={0.5} sx={{ width: '100%', alignItems: 'flex-start' }}>
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{ alignItems: 'center', justifyContent: 'flex-start', width: '100%', minWidth: 0 }}
                >
                  <Typography
                    component="h1"
                    sx={{
                      fontWeight: 800,
                      fontSize: '1.125rem',
                      lineHeight: 1.15,
                      minWidth: 0,
                      flex: '1 1 auto',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textAlign: 'left',
                    }}
                  >
                    {displayName}
                  </Typography>
                  {isVerified ? <ProfessionalVerifiedBadge /> : null}
                </Stack>
                <Typography sx={{ fontSize: FONT_CAPTION, color: 'text.secondary', lineHeight: 1.35, textAlign: 'left' }}>
                  {subtitle}
                </Typography>
                {locationLine ? (
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                    <MapPinIcon size={14} weight="regular" color="var(--mui-palette-primary-main)" />
                    <Typography sx={{ fontSize: FONT_CAPTION, fontWeight: 600 }}>{locationLine}</Typography>
                  </Stack>
                ) : null}
              </Stack>
            </Stack>

            {/* Key stats row */}
            <Box sx={surfaceSx}>
              <Grid container spacing={1.5}>
                <Grid size={4}>
                  <MetaStat icon={BriefcaseIcon} label="Specializimi" value={listing.categoryLabel} />
                </Grid>
                <Grid size={4}>
                  <MetaStat icon={ClockIcon} label="Përgjigjet shpejt" value={responseTime} />
                </Grid>
                <Grid size={4}>
                  <MetaStat icon={CurrencyEurIcon} label="Çmimi nga" value={priceFrom} />
                </Grid>
              </Grid>
            </Box>

            {/* Bio */}
            {listing.description ? (
              <RealEstateListingExpandableText
                text={listing.description}
                fontSize={FONT_BODY}
                readMoreLabel="Lexo më shumë"
                readLessLabel="Mbyll"
              />
            ) : null}

            {/* Services */}
            {serviceTags.length > 0 ? (
              <Stack spacing={1.25}>
                <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Shërbimet e mia</Typography>
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {serviceTags.map((tag, index) => {
                    const TagIcon = SERVICE_TAG_ICONS[index % SERVICE_TAG_ICONS.length]!;
                    return (
                      <Chip
                        key={tag}
                        icon={<TagIcon size={14} weight="duotone" color="var(--mui-palette-primary-main)" />}
                        label={tag}
                        size="small"
                        variant="outlined"
                        sx={{
                          height: 32,
                          fontWeight: 700,
                          fontSize: FONT_CAPTION,
                          borderColor: 'divider',
                          bgcolor: 'rgba(var(--mui-palette-background-paperChannel) / 0.45)',
                          '& .MuiChip-icon': { ml: 0.75 },
                        }}
                      />
                    );
                  })}
                </Stack>
              </Stack>
            ) : null}

            {/* Portfolio */}
            {portfolio.length > 0 ? (
              <Stack spacing={1.25}>
                <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Portofoli</Typography>
                <Stack
                  direction="row"
                  spacing={1.25}
                  sx={{
                    overflowX: 'auto',
                    pb: 0.5,
                    mx: -2,
                    px: 2,
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                  }}
                >
                  {portfolio.map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        flex: '0 0 148px',
                        borderRadius: 2.5,
                        overflow: 'hidden',
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ position: 'relative', height: 112 }}>
                        <Image src={item.imageUrl} alt={item.title} fill sizes="148px" style={{ objectFit: 'cover' }} />
                      </Box>
                      <Stack spacing={0.25} sx={{ p: 1 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: FONT_CAPTION, lineHeight: 1.25 }} noWrap>
                          {item.title}
                        </Typography>
                        {item.location ? (
                          <Typography sx={{ fontSize: '0.625rem', color: 'text.secondary' }} noWrap>
                            {item.location}
                          </Typography>
                        ) : null}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Stack>
            ) : null}

            {/* Reviews */}
            {reviews.length > 0 ? (
              <Stack spacing={1.5}>
                <ProfessionalReviewsSectionHeader rating={rating.rating} reviewCount={rating.reviews} />
                <Stack spacing={1.25}>
                  {reviews.map((review) => (
                    <Box key={review.id} sx={surfaceSx}>
                      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.14),
                            color: 'primary.main',
                            fontWeight: 800,
                            fontSize: FONT_CAPTION,
                          }}
                        >
                          {review.initials}
                        </Avatar>
                        <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                            <Typography sx={{ fontWeight: 800, fontSize: FONT_CAPTION }}>{review.author}</Typography>
                            <Typography sx={{ fontSize: '0.625rem', color: 'text.disabled', flexShrink: 0 }}>
                              {review.dateLabel}
                            </Typography>
                          </Stack>
                          <ReviewStars rating={review.rating} />
                          <Typography sx={{ fontSize: FONT_CAPTION, color: 'text.secondary', lineHeight: 1.45 }}>
                            {review.text}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Stack>
            ) : null}

            {/* Similar */}
            {similar.length > 0 ? (
              <Stack spacing={1.5} sx={{ pt: 0.5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Profesionistë të ngjashëm</Typography>
                <Box sx={{ mx: -2, '& > div > div': { py: '8px 0 0 !important' } }}>
                  <ListingsCarousel slotWidth={{ xs: 260, sm: 280, md: 300 }}>
                    {similar.map((item) => (
                      <DirectoryListingCard key={item.id} listing={item} />
                    ))}
                  </ListingsCarousel>
                </Box>
              </Stack>
            ) : null}

            <Box sx={{ textAlign: 'center', pt: 0.5 }}>
              <Button
                component={Link}
                href={paths.public.professionals}
                variant="text"
                sx={{ fontWeight: 700, textTransform: 'none', fontSize: FONT_BODY }}
              >
                Kthehu te lista e profesionistëve
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
            bottom: MOBILE_BOTTOM_NAV_OFFSET,
            zIndex: 25,
            px: 2,
            pt: 1.25,
            pb: 1.25,
            bgcolor: 'rgba(var(--mui-palette-background-defaultChannel) / 0.96)',
            backdropFilter: 'blur(14px)',
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" spacing={1.25} sx={{ maxWidth: CONTENT_MAX, mx: 'auto', width: '100%', alignItems: 'center' }}>
            <Button
              component={telHref ? 'a' : 'button'}
              href={telHref ?? undefined}
              disabled={!telHref}
              variant="contained"
              startIcon={<ChatsCircleIcon weight="regular" size={22} />}
              sx={{
                flex: 1,
                py: 1.35,
                borderRadius: 999,
                fontWeight: 800,
                textTransform: 'none',
                fontSize: FONT_BODY,
                boxShadow: 'none',
                color: 'grey.900',
              }}
            >
              Kontakto profesionistin
            </Button>
            {whatsappInquireHref ? (
              <Button
                component="a"
                href={whatsappInquireHref}
                rel="noopener noreferrer"
                target="_blank"
                variant="outlined"
                sx={{
                  px: 1.85,
                  minWidth: 'auto',
                  flexShrink: 0,
                  borderRadius: 2,
                  ...whatsappOutlinedButtonSx,
                }}
                aria-label="WhatsApp"
              >
                <WhatsappLogoIcon weight="regular" size={26} />
              </Button>
            ) : null}
          </Stack>
        </Box>
      </Box>
    </>
  );
}
