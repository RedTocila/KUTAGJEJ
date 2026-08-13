'use client';

import * as React from 'react';
import {
  Box,
  Button,
  ButtonBase,
  Container,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ListingDetailTitleBadges } from '@/components/public/listing-detail-title-badges';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Phone as PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';

import { HistoryBackButton } from '@/components/public/product-browse-chrome';
import { BusinessReservationPanel } from '@/components/public/business-reservation-panel';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { BusinessPromoBanner } from '@/components/public/listing-cards/business-promo-banner';
import { BusinessMenuPreview } from '@/components/public/business-menu-section';
import { BusinessOpenStatusLine } from '@/components/public/business-open-status-line';
import { ListingMessageButton } from '@/components/public/listing-message-button';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { RealEstateListingGallery } from '@/components/public/real-estate-listing-gallery';
import { LocationMapEmbed } from '@/components/public/location-map-embed';
import {
  businessCategorySubtitle,
  businessOpenStatusLine,
} from '@/lib/business-listing-detail-content';
import { businessLocationLine, businessMapLocation, scrollToBusinessLocationMap } from '@/lib/google-maps-location';
import { BusinessReviewSection } from '@/components/businesses/business-review-section';
import { listingDetailGalleryPlaceholder } from '@/lib/listing-gallery-placeholder';
import {
  LISTING_DETAIL_HERO_GALLERY_MAX_WIDTH_PX,
  LISTING_DETAIL_HERO_IMAGE_SIZES,
} from '@/lib/listing-detail-layout';
import type { PublicDirectoryListing, PublicDirectoryListingDetail } from '@/lib/public-listings-client';
import { paths } from '@/paths';
import { productButtonSx, productPanelSx } from '@/styles/product-sx';

const surfaceSx = {
  ...productPanelSx,
  p: 2.5,
} as const;

export function BusinessListingDetailDesktop({
  listing,
  similar,
  saved,
  saveCount,
  onToggleSave,
  showReservation,
  reserveDate,
  reservePeople,
  onReserveDate,
  onReservePeople,
  onReserve,
  reserveGuestName,
  reserveGuestPhone,
  reserveNote,
  onReserveGuestName,
  onReserveGuestPhone,
  onReserveNote,
  usePlatformReservation,
  reserveFeedback,
  reserveSubmitting,
  reserveOpen,
  onReserveOpen,
  canonicalUrl,
  ownerPreview = false,
}: {
  listing: PublicDirectoryListingDetail;
  similar: PublicDirectoryListing[];
  saved: boolean;
  saveCount: number;
  onToggleSave: () => void;
  showReservation: boolean;
  reserveDate: string;
  reservePeople: string;
  onReserveDate: (v: string) => void;
  onReservePeople: (v: string) => void;
  onReserve: () => void;
  reserveGuestName: string;
  reserveGuestPhone: string;
  reserveNote: string;
  onReserveGuestName: (v: string) => void;
  onReserveGuestPhone: (v: string) => void;
  onReserveNote: (v: string) => void;
  usePlatformReservation: boolean;
  reserveFeedback: string | null;
  reserveSubmitting: boolean;
  reserveOpen: boolean;
  onReserveOpen: (open: boolean) => void;
  canonicalUrl?: string;
  ownerPreview?: boolean;
}) {
  const categoryLine = React.useMemo(() => businessCategorySubtitle(listing), [listing]);
  const statusLine = React.useMemo(() => businessOpenStatusLine(listing), [listing]);
  const telHref = listing.contactPhone ?? listing.seller?.phone ?? null;
  const phoneHref = telHref ? `tel:${telHref.replace(/\s/g, '')}` : null;
  const mapLocation = React.useMemo(
    () =>
      businessMapLocation({
        locationLat: listing.locationLat,
        locationLng: listing.locationLng,
        mapsUrl: listing.mapsUrl,
        mapsPlaceQuery: listing.mapsPlaceQuery,
        zoneName: listing.zoneName,
        cityName: listing.cityName,
      }),
    [
      listing.cityName,
      listing.locationLat,
      listing.locationLng,
      listing.mapsPlaceQuery,
      listing.mapsUrl,
      listing.zoneName,
    ],
  );
  const locationLine = React.useMemo(
    () =>
      businessLocationLine({
        locationAddress: listing.locationAddress,
        zoneName: listing.zoneName,
        cityName: listing.cityName,
      }),
    [listing.cityName, listing.locationAddress, listing.zoneName],
  );

  const reservationPanelProps = {
    open: reserveOpen,
    onOpenChange: onReserveOpen,
    reserveDate,
    onReserveDate,
    reservePeople,
    onReservePeople,
    reserveGuestName,
    onReserveGuestName,
    reserveGuestPhone,
    onReserveGuestPhone,
    reserveNote,
    onReserveNote,
    usePlatformReservation,
    reserveFeedback,
    reserveSubmitting,
    onReserve,
    telHref: phoneHref,
    bodyFontSize: '0.875rem',
    captionFontSize: '0.78rem',
  } as const;

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
              bgcolor: 'background.paper',
              border: 'none',
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
                title={listing.title}
                imageUrls={listing.imageUrls}
                placeholderIcon={listingDetailGalleryPlaceholder(listing)}
                browseListHref={paths.public.businesses}
                browseListAriaLabel="Prapa te lista e bizneseve"
                heroSizes={LISTING_DETAIL_HERO_IMAGE_SIZES}
                listingKind="businesses"
                listingId={listing.id}
                shareCount={listing.shareCount}
                saveCount={saveCount}
                bookmark={{ saved, onToggle: onToggleSave }}
              />
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                flex: '0 0 auto',
                width: 'min(380px, 34%)',
                minWidth: 300,
                maxWidth: 400,
                bgcolor: 'background.paper',
                p: 2.5,
              }}
            >
              <Stack spacing={2} sx={{ width: '100%' }}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography component="h1" sx={{ fontWeight: 800, fontSize: '1.35rem', lineHeight: 1.2 }}>
                      {listing.title}
                      <ListingDetailTitleBadges
                        verified={Boolean(listing.seller?.verified)}
                        trustBadge={Boolean(listing.seller?.trustBadge)}
                        verifiedLabel="Biznes i verifikuar"
                      />
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', lineHeight: 1.4 }}>{categoryLine}</Typography>
                  {locationLine ? (
                    <ButtonBase
                      component="a"
                      href="#business-location-map"
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToBusinessLocationMap();
                      }}
                      sx={{
                        display: 'inline-flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 0.5,
                        color: 'text.secondary',
                        borderRadius: 1,
                        textAlign: 'left',
                        maxWidth: '100%',
                        '&:hover': { color: 'primary.main' },
                      }}
                    >
                      <MapPinIcon size={16} weight="regular" />
                      <Typography sx={{ fontSize: '0.8rem' }}>{locationLine}</Typography>
                    </ButtonBase>
                  ) : null}
                  <BusinessReviewSection
                    variant="summary"
                    listingId={listing.id}
                    ratingAverage={listing.ratingAverage}
                    reviewCount={listing.reviewCount}
                  />
                  {statusLine ? <BusinessOpenStatusLine statusLine={statusLine} /> : null}
                </Stack>

                <Divider />

                {listing.announcementTitle?.trim() ? (
                  showReservation ? (
                    <ButtonBase onClick={() => onReserveOpen(true)} sx={{ width: '100%', textAlign: 'left', display: 'block', borderRadius: 3 }}>
                      <BusinessPromoBanner
                        title={listing.announcementTitle}
                        subtitle={listing.announcementSubtitle}
                        bannerUrl={listing.announcementBannerUrl}
                        variant="detail"
                      />
                    </ButtonBase>
                  ) : (
                    <BusinessPromoBanner
                      title={listing.announcementTitle}
                      subtitle={listing.announcementSubtitle}
                      bannerUrl={listing.announcementBannerUrl}
                      variant="detail"
                    />
                  )
                ) : null}

                {showReservation ? (
                  <BusinessReservationPanel {...reservationPanelProps} />
                ) : null}

                <Stack direction="row" spacing={1} data-listing-contact="">
                  <Button
                    component={phoneHref ? 'a' : 'button'}
                    href={phoneHref ?? undefined}
                    variant="outlined"
                    disabled={!phoneHref}
                    fullWidth
                    startIcon={<PhoneIcon size={18} weight="regular" />}
                    sx={{ ...productButtonSx, py: 1.25, borderWidth: 2 }}
                  >
                    Telefono
                  </Button>
                </Stack>
                <ListingMessageButton
                  listingKind="businesses"
                  listingId={listing.id}
                  contactPhone={telHref}
                  listingTitle={listing.title}
                  listingUrl={canonicalUrl}
                  fullWidth
                  variant="outlined"
                  sx={{ ...productButtonSx, py: 1.1 }}
                />
              </Stack>
            </Box>
          </Stack>
          </Box>

          <Stack spacing={4} sx={{ width: '100%' }}>
          {listing.description ? (
            <Box sx={surfaceSx}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', mb: 1.5 }}>Rreth biznesit</Typography>
              <RealEstateListingExpandableText
                text={listing.description}
                fontSize="0.9rem"
                readMoreLabel="Shiko më shumë"
                readLessLabel="Shiko më pak"
              />
            </Box>
          ) : null}

          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', mb: 1.5 }}>Menu</Typography>
            <BusinessMenuPreview listing={listing} maxPerCategory={4} />
          </Box>

          {mapLocation ? (
            <Box data-business-location-map sx={{ scrollMarginTop: 96 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', mb: 1.5 }}>Vendndodhja</Typography>
              <LocationMapEmbed
                query={mapLocation.query}
                lat={mapLocation.lat}
                lng={mapLocation.lng}
                height={280}
              />
            </Box>
          ) : null}

          <BusinessReviewSection
            variant="list"
            listingId={listing.id}
            ratingAverage={listing.ratingAverage}
            reviewCount={listing.reviewCount}
          />

          {similar.length > 0 ? (
            <Stack spacing={2}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }}>Biznese të ngjashme</Typography>
              <ListingsCarousel slotWidth={{ md: 300 }}>
                {similar.map((item) => (
                  <DirectoryListingCard key={item.id} listing={item} />
                ))}
              </ListingsCarousel>
            </Stack>
          ) : null}

          <Box sx={{ textAlign: 'center' }}>
            <HistoryBackButton href={paths.public.businesses}>Kthehu te lista e bizneseve</HistoryBackButton>
          </Box>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
