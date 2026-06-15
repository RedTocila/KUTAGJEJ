'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { CalendarBlank as CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { BusinessVerifiedBadge } from '@/components/public/professional-listing-detail-ui';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Phone as PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';

import { SearchableSelect } from '@/components/core/searchable-select';
import { ListingMessageButton } from '@/components/public/listing-message-button';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { BusinessPromoBanner } from '@/components/public/listing-cards/business-promo-banner';
import { formatPrice } from '@/components/public/listing-cards/format-helpers';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { RealEstateListingGallery } from '@/components/public/real-estate-listing-gallery';
import {
  businessCategorySubtitle,
  businessGalleryThumbs,
  businessMenuCategoryNames,
  businessMenuItemsForCategory,
  businessOpenStatusLine,
  businessRatingDisplay,
  reservationDateOptions,
} from '@/lib/business-listing-detail-content';
import { createBusinessReservation } from '@/lib/business-reservations-client';
import { BusinessReviewSection } from '@/components/businesses/business-review-section';
import {
  DEFAULT_RESERVATION_PARTY_SIZES,
  DEFAULT_RESERVATION_TIME_SLOTS,
} from '@/lib/business-constants';
import { listingDetailGalleryPlaceholder } from '@/lib/listing-gallery-placeholder';
import type { PublicDirectoryListing, PublicDirectoryListingDetail } from '@/lib/public-listings-client';
import { BusinessListingDetailDesktop } from '@/components/public/business-listing-detail-desktop';
import { MOBILE_BOTTOM_NAV_OFFSET } from '@/lib/mobile-layout';
import { paths } from '@/paths';
import { ListingMetricsTracker } from '@/components/public/listing-metrics-tracker';
import { useListingBookmark } from '@/hooks/use-listing-bookmark';

const FONT_BODY = '0.875rem';
const FONT_CAPTION = '0.75rem';
const FONT_TITLE = '1.375rem';

const CONTENT_MAX = 480;

const surfaceSx = {
  p: 2,
  borderRadius: 3,
  bgcolor: 'rgba(var(--mui-palette-background-paperChannel) / 0.55)',
  border: '1px solid',
  borderColor: 'divider',
} as const;


function selectFieldSx() {
  return {
    flex: 1,
    minWidth: 0,
    '& .MuiOutlinedInput-root': {
      borderRadius: 2.5,
      bgcolor: 'rgba(var(--mui-palette-background-defaultChannel) / 0.85)',
      fontSize: FONT_CAPTION,
      fontWeight: 600,
    },
    '& .MuiInputLabel-root': { fontSize: FONT_CAPTION },
  } as const;
}

export function BusinessListingDetailView({
  listing,
  similar = [],
}: {
  listing: PublicDirectoryListingDetail;
  /** Reserved for metadata / future share overrides. */
  canonicalUrl?: string;
  similar?: PublicDirectoryListing[];
}) {
  const router = useRouter();
  const { saved, saveCount, toggleSave } = useListingBookmark('businesses', listing.id, {
    saved: listing.saved,
    saveCount: listing.saveCount,
  });
  const [menuCategory, setMenuCategory] = React.useState('');
  const [reserveDate, setReserveDate] = React.useState('');
  const [reserveTime, setReserveTime] = React.useState('');
  const [reservePeople, setReservePeople] = React.useState('2');
  const [reserveGuestName, setReserveGuestName] = React.useState('');
  const [reserveGuestPhone, setReserveGuestPhone] = React.useState('');
  const [reserveFeedback, setReserveFeedback] = React.useState<string | null>(null);
  const [reserveSubmitting, setReserveSubmitting] = React.useState(false);
  const [savedMenuHearts, setSavedMenuHearts] = React.useState<Set<string>>(() => new Set());
  const [reviewRefresh, setReviewRefresh] = React.useState(0);

  const phone = listing.contactPhone ?? listing.seller?.phone ?? null;
  const telHref = phone ? `tel:${phone.replace(/\s/g, '')}` : null;
  const rating = React.useMemo(() => businessRatingDisplay(listing), [listing, reviewRefresh]);
  const categoryLine = React.useMemo(() => businessCategorySubtitle(listing), [listing]);
  const statusLine = React.useMemo(() => businessOpenStatusLine(listing), [listing]);
  const menuCategories = React.useMemo(() => businessMenuCategoryNames(listing), [listing]);
  const activeMenuCategory = menuCategory || menuCategories[0] || '';
  const menuItems = React.useMemo(
    () => (activeMenuCategory ? businessMenuItemsForCategory(listing, activeMenuCategory) : []),
    [listing, activeMenuCategory],
  );
  const gallery = React.useMemo(() => businessGalleryThumbs(listing.imageUrls, 4), [listing.imageUrls]);
  const dateOptions = React.useMemo(() => reservationDateOptions(), []);
  const timeOptions =
    listing.reservationTimeSlots?.length ? listing.reservationTimeSlots : DEFAULT_RESERVATION_TIME_SLOTS;
  const peopleOptions =
    listing.reservationPartySizes?.length ? listing.reservationPartySizes : DEFAULT_RESERVATION_PARTY_SIZES;

  const showReservation = listing.reservationsEnabled;
  const usePlatformReservation = showReservation && !listing.reservationUrl?.trim();
  const reserveHref = listing.reservationUrl?.trim() || telHref;

  React.useEffect(() => {
    if (!reserveDate && dateOptions[0]) setReserveDate(dateOptions[0].value);
    if (!reserveTime && timeOptions[0]) setReserveTime(timeOptions[0]);
    if (!reservePeople && peopleOptions[0]) setReservePeople(String(peopleOptions[0]));
  }, [dateOptions, reserveDate, reserveTime, reservePeople, timeOptions, peopleOptions]);

  const handleReserve = async () => {
    if (listing.reservationUrl?.trim()) {
      const url = new URL(listing.reservationUrl.trim());
      if (reserveDate) url.searchParams.set('date', reserveDate);
      if (reserveTime) url.searchParams.set('time', reserveTime);
      if (reservePeople) url.searchParams.set('guests', reservePeople);
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
      return;
    }
    if (usePlatformReservation) {
      const name = reserveGuestName.trim();
      const phone = reserveGuestPhone.trim();
      if (name.length < 2) {
        setReserveFeedback('Shkruani emrin e plotë.');
        return;
      }
      if (phone.length < 6) {
        setReserveFeedback('Shkruani numrin e telefonit.');
        return;
      }
      setReserveSubmitting(true);
      setReserveFeedback(null);
      const res = await createBusinessReservation({
        listingId: listing.id,
        guestName: name,
        guestPhone: phone,
        partySize: Number.parseInt(reservePeople, 10) || 1,
        reservationDate: reserveDate,
        timeSlot: reserveTime,
      });
      setReserveSubmitting(false);
      if (res.error) setReserveFeedback(res.error);
      else setReserveFeedback('Rezervimi u dërgua. Biznesi do t’ju kontaktojë.');
      return;
    }
    if (telHref) window.location.href = telHref;
  };

  const toggleMenuHeart = (id: string) => {
    setSavedMenuHearts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stickyFooterHeight = '88px';
  const scrollPadBottom = {
    xs: `calc(${stickyFooterHeight} + ${MOBILE_BOTTOM_NAV_OFFSET})`,
    md: `calc(${stickyFooterHeight} + env(safe-area-inset-bottom, 0px))`,
  };

  return (
    <>
      <ListingMetricsTracker listingKind="businesses" listingId={listing.id} />
      <BusinessListingDetailDesktop
        listing={listing}
        similar={similar}
        saved={saved}
        saveCount={saveCount}
        onToggleSave={() => void toggleSave()}
        showReservation={showReservation}
        reserveHref={reserveHref}
        reserveDate={reserveDate}
        reserveTime={reserveTime}
        reservePeople={reservePeople}
        onReserveDate={setReserveDate}
        onReserveTime={setReserveTime}
        onReservePeople={setReservePeople}
        dateOptions={dateOptions}
        timeOptions={timeOptions}
        peopleOptions={peopleOptions}
        reserveGuestName={reserveGuestName}
        reserveGuestPhone={reserveGuestPhone}
        onReserveGuestName={setReserveGuestName}
        onReserveGuestPhone={setReserveGuestPhone}
        usePlatformReservation={usePlatformReservation}
        reserveFeedback={reserveFeedback}
        reserveSubmitting={reserveSubmitting}
        onReserve={() => void handleReserve()}
        menuCategory={menuCategory}
        onMenuCategory={setMenuCategory}
        savedMenuHearts={savedMenuHearts}
        onToggleMenuHeart={toggleMenuHeart}
      />

      <Box sx={{ display: { xs: 'block', md: 'none' }, bgcolor: 'background.default', minHeight: '100vh', pb: scrollPadBottom }}>
      <Box sx={{ maxWidth: { md: CONTENT_MAX + 32 }, mx: 'auto', width: '100%' }}>
        <RealEstateListingGallery
          title={listing.title}
          imageUrls={listing.imageUrls}
          placeholderIcon={listingDetailGalleryPlaceholder(listing)}
          browseListHref={paths.public.businesses}
          browseListAriaLabel="Prapa te lista e bizneseve"
          listingKind="businesses"
          listingId={listing.id}
          shareCount={listing.shareCount}
          saveCount={saveCount}
          bookmark={{
            saved,
            onToggle: () => void toggleSave(),
          }}
        />

        <Box sx={{ px: 2, pt: 2, pb: 3, maxWidth: CONTENT_MAX, mx: 'auto', width: '100%', boxSizing: 'border-box' }}>
          <Stack spacing={2.5}>
            {/* Title & meta */}
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start' }}>
                <Typography
                  component="h1"
                  sx={{ fontWeight: 800, fontSize: FONT_TITLE, lineHeight: 1.2, flex: 1 }}
                >
                  {listing.title}
                </Typography>
                <BusinessVerifiedBadge />
              </Stack>

              <Typography sx={{ fontSize: FONT_CAPTION, color: 'text.secondary', lineHeight: 1.4 }}>
                {categoryLine}
              </Typography>

              <Stack
                direction="row"
                spacing={1.5}
                sx={{ flexWrap: 'wrap', alignItems: 'center', rowGap: 0.75, columnGap: 1.5 }}
              >
                {rating.rating ? (
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <StarIcon size={16} weight="fill" color="var(--mui-palette-primary-main)" />
                    <Typography sx={{ fontSize: FONT_BODY, fontWeight: 700 }}>
                      {rating.rating}
                    </Typography>
                    <Typography sx={{ fontSize: FONT_CAPTION, color: 'text.secondary' }}>
                      ({rating.reviews} vlerësime)
                    </Typography>
                  </Stack>
                ) : null}
                {listing.cityName ? (
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                    <MapPinIcon size={16} weight="regular" />
                    <Typography sx={{ fontSize: FONT_CAPTION }}>{listing.cityName}, Shqipëri</Typography>
                  </Stack>
                ) : null}
              </Stack>

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
                  <Typography sx={{ fontSize: FONT_CAPTION, fontWeight: 600, color: 'primary.main' }}>
                    {statusLine}
                  </Typography>
                </Stack>
              ) : null}

              {listing.description ? (
                <Box>
                  <RealEstateListingExpandableText
                    text={listing.description}
                    fontSize={FONT_BODY}
                    readMoreLabel="Shiko më shumë"
                    readLessLabel="Shiko më pak"
                  />
                </Box>
              ) : null}

              <BusinessReviewSection
                listingId={listing.id}
                ratingAverage={listing.ratingAverage}
                reviewCount={listing.reviewCount}
                onReviewSubmitted={() => {
                  setReviewRefresh((n) => n + 1);
                  router.refresh();
                }}
              />
            </Stack>

            {/* Promo */}
            {showReservation ? (
              <ButtonBase
                onClick={handleReserve}
                sx={{ width: '100%', textAlign: 'left', display: 'block', borderRadius: 3 }}
              >
                <BusinessPromoBanner servicesHighlight={listing.servicesHighlight} variant="detail" />
              </ButtonBase>
            ) : null}

            {/* Reservation widget */}
            {showReservation ? (
              <Box sx={surfaceSx}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                  <CalendarBlankIcon size={22} weight="regular" color="var(--mui-palette-primary-main)" />
                  <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Rezervo tavolinën</Typography>
                </Stack>
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1}>
                    <SearchableSelect
                      label="Data"
                      value={reserveDate}
                      onChange={setReserveDate}
                      options={dateOptions}
                      emptyLabel="Zgjidhni datën…"
                      sx={selectFieldSx()}
                    />
                    <SearchableSelect
                      label="Ora"
                      value={reserveTime}
                      onChange={setReserveTime}
                      options={timeOptions.map((t) => ({ value: t, label: t }))}
                      emptyLabel="Zgjidhni orën…"
                      sx={selectFieldSx()}
                    />
                    <SearchableSelect
                      label="Persona"
                      value={reservePeople}
                      onChange={setReservePeople}
                      options={peopleOptions.map((n) => ({ value: String(n), label: String(n) }))}
                      emptyLabel="Zgjidhni…"
                      sx={selectFieldSx()}
                    />
                  </Stack>
                  {usePlatformReservation ? (
                    <Stack spacing={1}>
                      <TextField
                        size="small"
                        label="Emri i plotë"
                        value={reserveGuestName}
                        onChange={(e) => setReserveGuestName(e.target.value)}
                        fullWidth
                      />
                      <TextField
                        size="small"
                        label="Telefoni"
                        value={reserveGuestPhone}
                        onChange={(e) => setReserveGuestPhone(e.target.value)}
                        fullWidth
                      />
                    </Stack>
                  ) : null}
                  {reserveFeedback ? (
                    <Alert severity={reserveFeedback.includes('dërgua') ? 'success' : 'warning'} sx={{ py: 0 }}>
                      {reserveFeedback}
                    </Alert>
                  ) : null}
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => void handleReserve()}
                    disabled={usePlatformReservation ? reserveSubmitting : !reserveHref}
                    sx={{
                      py: 1.35,
                      borderRadius: 2.5,
                      fontWeight: 800,
                      textTransform: 'none',
                      fontSize: FONT_BODY,
                      boxShadow: 'none',
                    }}
                  >
                    {reserveSubmitting ? 'Duke dërguar…' : 'Rezervo tani'}
                  </Button>
                </Stack>
              </Box>
            ) : null}

            {/* Menu */}
            {menuItems.length > 0 ? (
              <Stack spacing={1.5}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Menu</Typography>
                  <Button
                    variant="text"
                    endIcon={<ArrowRightIcon size={16} weight="bold" />}
                    sx={{
                      fontWeight: 700,
                      textTransform: 'none',
                      fontSize: FONT_CAPTION,
                      minWidth: 0,
                      px: 0.5,
                    }}
                  >
                    Shiko të plotë
                  </Button>
                </Stack>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    overflowX: 'auto',
                    pb: 0.5,
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                  }}
                >
                  {menuCategories.map((cat) => {
                    const active = cat === activeMenuCategory;
                    return (
                      <Button
                        key={cat}
                        size="small"
                        variant={active ? 'outlined' : 'text'}
                        onClick={() => setMenuCategory(cat)}
                        sx={{
                          flexShrink: 0,
                          borderRadius: 999,
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: FONT_CAPTION,
                          px: 1.75,
                          py: 0.65,
                          borderWidth: active ? 2 : 0,
                          borderColor: 'primary.main',
                          color: active ? 'primary.main' : 'text.secondary',
                          bgcolor: active ? alpha('#000', 0) : 'transparent',
                        }}
                      >
                        {cat}
                      </Button>
                    );
                  })}
                </Stack>
                <Stack spacing={1.5}>
                  {menuItems.map((item) => {
                    const hearted = savedMenuHearts.has(item.id);
                    return (
                      <Stack
                        key={item.id}
                        direction="row"
                        spacing={1.25}
                        sx={{ alignItems: 'flex-start' }}
                      >
                        <Box
                          sx={{
                            position: 'relative',
                            width: 72,
                            height: 72,
                            flexShrink: 0,
                            borderRadius: 2,
                            overflow: 'hidden',
                            bgcolor: 'grey.900',
                          }}
                        >
                          {item.imageUrl ? (
                            <Image src={item.imageUrl} alt="" fill sizes="72px" style={{ objectFit: 'cover' }} />
                          ) : (
                            <Box
                              sx={{
                                width: '100%',
                                height: '100%',
                                bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.12)',
                              }}
                            />
                          )}
                        </Box>
                        <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY, lineHeight: 1.25 }}>
                            {item.name}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: FONT_CAPTION,
                              color: 'text.secondary',
                              lineHeight: 1.4,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {item.description}
                          </Typography>
                          <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY, color: 'primary.main', pt: 0.25 }}>
                            {formatPrice(item.price, item.currency)}
                          </Typography>
                        </Stack>
                        <ButtonBase
                          aria-label={hearted ? 'Hiq nga të preferuarat' : 'Shto te të preferuarat'}
                          onClick={() => toggleMenuHeart(item.id)}
                          sx={{ p: 0.5, borderRadius: 2, color: hearted ? 'primary.main' : 'text.secondary' }}
                        >
                          <BookmarkSimpleIcon size={20} weight={hearted ? 'fill' : 'regular'} />
                        </ButtonBase>
                      </Stack>
                    );
                  })}
                </Stack>
              </Stack>
            ) : null}

            {/* Ambient gallery */}
            {gallery.visible.length > 0 ? (
              <Stack spacing={1.25}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Ambient &amp; Galeri</Typography>
                  <Typography
                    component="span"
                    sx={{ fontSize: FONT_CAPTION, fontWeight: 700, color: 'primary.main' }}
                  >
                    Shiko të gjitha
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                  {gallery.visible.map((url, idx) => (
                    <Box
                      key={`${url}-${idx}`}
                      sx={{
                        position: 'relative',
                        width: 88,
                        height: 88,
                        flexShrink: 0,
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <Image src={url} alt="" fill sizes="88px" style={{ objectFit: 'cover' }} />
                    </Box>
                  ))}
                  {gallery.extraCount > 0 ? (
                    <Box
                      sx={{
                        width: 88,
                        height: 88,
                        flexShrink: 0,
                        borderRadius: 2,
                        bgcolor: 'grey.900',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>+{gallery.extraCount}</Typography>
                    </Box>
                  ) : null}
                </Stack>
              </Stack>
            ) : null}

            {/* Similar */}
            {similar.length > 0 ? (
              <Stack spacing={1.5} sx={{ pt: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Biznese të ngjashme</Typography>
                <ListingsCarousel slotWidth={{ xs: 260, sm: 280, md: 300 }}>
                  {similar.map((item) => (
                    <DirectoryListingCard key={item.id} listing={item} />
                  ))}
                </ListingsCarousel>
              </Stack>
            ) : null}

            <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'center', pt: 1 }}>
              <Button
                component={Link}
                href={paths.public.businesses}
                variant="text"
                sx={{ fontWeight: 700, textTransform: 'none', fontSize: FONT_BODY }}
              >
                Kthehu te lista e bizneseve
              </Button>
            </Box>
          </Stack>
        </Box>
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
          pt: 1.25,
          pb: 1.25,
          bgcolor: 'rgba(var(--mui-palette-background-defaultChannel) / 0.96)',
          backdropFilter: 'blur(14px)',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack
          direction="row"
          spacing={1.25}
          sx={{ maxWidth: CONTENT_MAX, mx: 'auto', width: '100%' }}
        >
          <Button
            component={telHref ? 'a' : 'button'}
            href={telHref ?? undefined}
            variant="outlined"
            disabled={!telHref}
            startIcon={<PhoneIcon size={18} weight="regular" />}
            sx={{
              flex: 1,
              py: 1.25,
              borderRadius: 2.5,
              fontWeight: 800,
              textTransform: 'none',
              fontSize: FONT_BODY,
              borderWidth: 2,
              borderColor: 'divider',
              color: 'text.primary',
            }}
          >
            Telefono
          </Button>
          <Button
            variant="contained"
            startIcon={<CalendarBlankIcon size={18} weight="fill" />}
            onClick={handleReserve}
            disabled={!showReservation && !reserveHref}
            sx={{
              flex: 1.6,
              py: 1.25,
              borderRadius: 2.5,
              fontWeight: 800,
              textTransform: 'none',
              fontSize: FONT_BODY,
              boxShadow: 'none',
            }}
          >
            Rezervo tani
          </Button>
          <ListingMessageButton
            listingKind="businesses"
            listingId={listing.id}
            aria-label="Dërgo mesazh"
            variant="outlined"
            sx={{ px: 1.5, minWidth: 'auto', flexShrink: 0, borderRadius: 2.5, py: 1.25 }}
          >
            <ChatsCircleIcon weight="regular" size={24} />
          </ListingMessageButton>
        </Stack>
      </Box>

    </Box>
    </>
  );
}
