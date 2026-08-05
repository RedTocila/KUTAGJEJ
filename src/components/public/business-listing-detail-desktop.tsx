'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Collapse,
  Container,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { CalendarBlank as CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { BusinessVerifiedBadge } from '@/components/public/professional-listing-detail-ui';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Phone as PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';

import { ReservationDateField } from '@/components/core/reservation-date-field';
import { SearchableSelect } from '@/components/core/searchable-select';
import { ListingMessageButton } from '@/components/public/listing-message-button';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { BusinessPromoBanner } from '@/components/public/listing-cards/business-promo-banner';
import { BusinessMenuPreview } from '@/components/public/business-menu-section';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { RealEstateListingGallery } from '@/components/public/real-estate-listing-gallery';
import {
  businessCategorySubtitle,
  businessOpenStatusLine,
} from '@/lib/business-listing-detail-content';
import { BusinessReviewSection } from '@/components/businesses/business-review-section';
import { listingDetailGalleryPlaceholder } from '@/lib/listing-gallery-placeholder';
import {
  LISTING_DETAIL_HERO_GALLERY_MAX_WIDTH_PX,
  LISTING_DETAIL_HERO_IMAGE_SIZES,
} from '@/lib/listing-detail-layout';
import type { PublicDirectoryListing, PublicDirectoryListingDetail } from '@/lib/public-listings-client';
import { paths } from '@/paths';
import { productButtonSx, productFieldSx, productPanelSx } from '@/styles/product-sx';

const surfaceSx = {
  ...productPanelSx,
  p: 2.5,
} as const;

const reserveFieldSx = {
  ...productFieldSx,
  '& .MuiOutlinedInput-root': {
    ...productFieldSx['& .MuiOutlinedInput-root'],
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  '& .MuiInputLabel-root': { fontSize: '0.8rem', fontWeight: 600 },
} as const;

function selectFieldSx(flex = 1) {
  return {
    flex,
    minWidth: 0,
    ...reserveFieldSx,
  } as const;
}

export function BusinessListingDetailDesktop({
  listing,
  similar,
  saved,
  saveCount,
  onToggleSave,
  showReservation,
  reserveHref,
  reserveDate,
  reserveTime,
  reservePeople,
  onReserveDate,
  onReserveTime,
  onReservePeople,
  timeOptions,
  peopleOptions,
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
  ownerPreview = false,
}: {
  listing: PublicDirectoryListingDetail;
  similar: PublicDirectoryListing[];
  saved: boolean;
  saveCount: number;
  onToggleSave: () => void;
  showReservation: boolean;
  reserveHref: string | null;
  reserveDate: string;
  reserveTime: string;
  reservePeople: string;
  onReserveDate: (v: string) => void;
  onReserveTime: (v: string) => void;
  onReservePeople: (v: string) => void;
  timeOptions: string[];
  peopleOptions: number[];
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
  ownerPreview?: boolean;
}) {
  const categoryLine = React.useMemo(() => businessCategorySubtitle(listing), [listing]);
  const statusLine = React.useMemo(() => businessOpenStatusLine(listing), [listing]);
  const telHref = listing.contactPhone ?? listing.seller?.phone ?? null;
  const phoneHref = telHref ? `tel:${telHref.replace(/\s/g, '')}` : null;

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
                    </Typography>
                    <BusinessVerifiedBadge />
                  </Stack>
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', lineHeight: 1.4 }}>{categoryLine}</Typography>
                  {listing.cityName ? (
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                      <MapPinIcon size={16} weight="regular" />
                      <Typography sx={{ fontSize: '0.8rem' }}>{listing.cityName}</Typography>
                    </Stack>
                  ) : null}
                  <BusinessReviewSection
                    variant="summary"
                    listingId={listing.id}
                    ratingAverage={listing.ratingAverage}
                    reviewCount={listing.reviewCount}
                  />
                  {statusLine ? (
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          boxShadow: (theme) => `0 0 0 3px ${alpha(theme.palette.primary.main, 0.25)}`,
                        }}
                      />
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'primary.main' }}>{statusLine}</Typography>
                    </Stack>
                  ) : null}
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
                  <Box sx={{ ...surfaceSx, p: 0, overflow: 'hidden' }}>
                    <ButtonBase
                      onClick={() => onReserveOpen(!reserveOpen)}
                      aria-expanded={reserveOpen}
                      sx={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1.5,
                        px: 2,
                        py: 1.5,
                        textAlign: 'left',
                        bgcolor: reserveOpen ? 'transparent' : 'primary.main',
                        color: reserveOpen ? 'text.primary' : 'primary.contrastText',
                        transition: 'background-color 0.15s ease, color 0.15s ease',
                      }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                        <CalendarBlankIcon
                          size={22}
                          weight={reserveOpen ? 'regular' : 'fill'}
                          color={reserveOpen ? 'var(--mui-palette-primary-main)' : 'currentColor'}
                        />
                        <Stack spacing={0.15} sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.25 }}>
                            Rezervo tavolinën
                          </Typography>
                          {!reserveOpen && usePlatformReservation ? (
                            <Typography sx={{ fontSize: '0.75rem', opacity: 0.75, lineHeight: 1.3 }}>
                              Hap formularin e rezervimit
                            </Typography>
                          ) : null}
                        </Stack>
                      </Stack>
                      <Box
                        sx={{
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          transition: 'transform 0.2s ease',
                          transform: reserveOpen ? 'rotate(180deg)' : 'none',
                        }}
                      >
                        <CaretDownIcon size={18} weight="bold" />
                      </Box>
                    </ButtonBase>

                    <Collapse in={reserveOpen} unmountOnExit>
                      <Box sx={{ px: 2, pb: 2, pt: 0.5 }}>
                        {usePlatformReservation ? (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontSize: '0.78rem', mb: 1.5, lineHeight: 1.45 }}
                          >
                            Plotësoni fushat — kërkesa dërgohet si mesazh te biznesi.
                          </Typography>
                        ) : null}
                        <Stack spacing={1.5}>
                          <ReservationDateField
                            size="small"
                            label="Data"
                            value={reserveDate}
                            onChange={onReserveDate}
                            emptyLabel="Zgjidhni datën…"
                            sx={selectFieldSx()}
                          />
                          <Stack direction="row" spacing={1.25}>
                            <SearchableSelect
                              size="small"
                              label="Ora"
                              value={reserveTime}
                              onChange={onReserveTime}
                              options={timeOptions.map((t) => ({ value: t, label: t }))}
                              emptyLabel="Ora…"
                              clearable={false}
                              menuMinWidth={140}
                              sx={selectFieldSx(1.2)}
                            />
                            <SearchableSelect
                              size="small"
                              label="Persona"
                              value={reservePeople}
                              onChange={onReservePeople}
                              options={peopleOptions.map((n) => ({ value: String(n), label: String(n) }))}
                              emptyLabel="—"
                              clearable={false}
                              menuMinWidth={120}
                              sx={selectFieldSx(0.85)}
                            />
                          </Stack>
                          {usePlatformReservation ? (
                            <Stack spacing={1.25}>
                              <TextField
                                size="small"
                                label="Emri i plotë"
                                value={reserveGuestName}
                                onChange={(e) => onReserveGuestName(e.target.value)}
                                fullWidth
                                sx={reserveFieldSx}
                              />
                              <TextField
                                size="small"
                                label="Telefoni"
                                value={reserveGuestPhone}
                                onChange={(e) => onReserveGuestPhone(e.target.value)}
                                fullWidth
                                sx={reserveFieldSx}
                              />
                              <TextField
                                size="small"
                                label="Shënim (opsionale)"
                                value={reserveNote}
                                onChange={(e) => onReserveNote(e.target.value)}
                                fullWidth
                                multiline
                                minRows={2}
                                placeholder="p.sh. Tavolinë pranë dritares…"
                                sx={reserveFieldSx}
                              />
                            </Stack>
                          ) : null}
                          {reserveFeedback ? (
                            <Alert
                              severity={reserveFeedback.includes('dërgua') ? 'success' : 'warning'}
                              sx={{ py: 0.5, borderRadius: 2, alignItems: 'center' }}
                            >
                              {reserveFeedback}
                            </Alert>
                          ) : null}
                          <Button
                            variant="contained"
                            fullWidth
                            startIcon={
                              usePlatformReservation ? (
                                <ChatsCircleIcon size={18} weight="bold" />
                              ) : (
                                <CalendarBlankIcon size={18} weight="fill" />
                              )
                            }
                            onClick={onReserve}
                            disabled={usePlatformReservation ? reserveSubmitting : !reserveHref}
                            sx={{
                              ...productButtonSx,
                              py: 1.25,
                            }}
                          >
                            {reserveSubmitting
                              ? 'Duke dërguar…'
                              : usePlatformReservation
                                ? 'Dërgo rezervimin'
                                : 'Rezervo tani'}
                          </Button>
                        </Stack>
                      </Box>
                    </Collapse>
                  </Box>
                ) : null}

                <Stack direction="row" spacing={1}>
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
            <BusinessMenuPreview listing={listing} maxPerCategory={3} />
          </Box>

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
            <Button component={Link} href={paths.public.businesses} variant="text" sx={{ fontWeight: 700, textTransform: 'none' }}>
              Kthehu te lista e bizneseve
            </Button>
          </Box>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
