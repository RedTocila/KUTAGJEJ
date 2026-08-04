'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Collapse,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { CalendarBlank as CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { BusinessVerifiedBadge } from '@/components/public/professional-listing-detail-ui';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';

import { SearchableSelect } from '@/components/core/searchable-select';
import { BusinessMenuPreview } from '@/components/public/business-menu-section';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { BusinessPromoBanner } from '@/components/public/listing-cards/business-promo-banner';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { RealEstateListingGallery } from '@/components/public/real-estate-listing-gallery';
import {
  businessCategorySubtitle,
  businessOpenStatusLine,
  reservationDateOptions,
} from '@/lib/business-listing-detail-content';
import {
  setPendingBusinessReservation,
  submitBusinessReservationToMessages,
} from '@/lib/business-reservation-message';
import { BusinessReviewSection } from '@/components/businesses/business-review-section';
import {
  DEFAULT_RESERVATION_PARTY_SIZES,
  DEFAULT_RESERVATION_TIME_SLOTS,
} from '@/lib/business-constants';
import { listingDetailGalleryPlaceholder } from '@/lib/listing-gallery-placeholder';
import type { PublicDirectoryListing, PublicDirectoryListingDetail } from '@/lib/public-listings-client';
import { BusinessListingDetailDesktop } from '@/components/public/business-listing-detail-desktop';
import { MOBILE_CONTENT_BOTTOM_PADDING } from '@/lib/mobile-layout';
import { paths } from '@/paths';
import { ListingMetricsTracker } from '@/components/public/listing-metrics-tracker';
import { OwnerEditPencil, type OwnerEditHandlers } from '@/components/user/owner-edit-pencil';
import { useListingBookmark } from '@/hooks/use-listing-bookmark';
import { useUser } from '@/hooks/use-user';

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

const reserveFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2.5,
    bgcolor: 'rgba(var(--mui-palette-background-defaultChannel) / 0.85)',
    fontSize: FONT_BODY,
    fontWeight: 600,
  },
  '& .MuiInputLabel-root': { fontSize: FONT_CAPTION, fontWeight: 600 },
} as const;

function selectFieldSx(flex = 1) {
  return {
    flex,
    minWidth: 0,
    ...reserveFieldSx,
  } as const;
}

export function BusinessListingDetailView({
  listing,
  similar = [],
  ownerPreview = false,
  ownerEdit,
}: {
  listing: PublicDirectoryListingDetail;
  /** Reserved for metadata / future share overrides. */
  canonicalUrl?: string;
  similar?: PublicDirectoryListing[];
  /** Owner edit canvas — hide buyer chrome (contact, similar, metrics). */
  ownerPreview?: boolean;
  /** Inline pencil actions for owner edit. */
  ownerEdit?: OwnerEditHandlers;
}) {
  const router = useRouter();
  const { user, isLoading: authLoading, checkSession } = useUser();
  const { saved, saveCount, toggleSave } = useListingBookmark('businesses', listing.id, {
    saved: listing.saved,
    saveCount: listing.saveCount,
  });
  const [reserveDate, setReserveDate] = React.useState('');
  const [reserveTime, setReserveTime] = React.useState('');
  const [reservePeople, setReservePeople] = React.useState('2');
  const [reserveGuestName, setReserveGuestName] = React.useState('');
  const [reserveGuestPhone, setReserveGuestPhone] = React.useState('');
  const [reserveNote, setReserveNote] = React.useState('');
  const [reserveFeedback, setReserveFeedback] = React.useState<string | null>(null);
  const [reserveSubmitting, setReserveSubmitting] = React.useState(false);
  const [reserveOpen, setReserveOpen] = React.useState(false);

  const phone = listing.contactPhone ?? listing.seller?.phone ?? null;
  const telHref = phone ? `tel:${phone.replace(/\s/g, '')}` : null;
  const categoryLine = React.useMemo(() => businessCategorySubtitle(listing), [listing]);
  const statusLine = React.useMemo(() => businessOpenStatusLine(listing), [listing]);
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
      if (!reserveDate || !reserveTime) {
        setReserveFeedback('Zgjidhni datën dhe orën.');
        return;
      }
      if (name.length < 2) {
        setReserveFeedback('Shkruani emrin e plotë.');
        return;
      }
      if (phone.length < 6) {
        setReserveFeedback('Shkruani numrin e telefonit.');
        return;
      }

      const draft = {
        listingId: listing.id,
        guestName: name,
        guestPhone: phone,
        partySize: Number.parseInt(reservePeople, 10) || 1,
        reservationDate: reserveDate,
        timeSlot: reserveTime,
        note: reserveNote.trim() || undefined,
      };

      const hasToken =
        typeof window !== 'undefined' && Boolean(localStorage.getItem('custom-auth-token'));
      if (!user && !hasToken) {
        setPendingBusinessReservation(draft);
        router.push(paths.user.auth);
        return;
      }
      if (!user && hasToken) {
        await checkSession();
      }

      setReserveSubmitting(true);
      setReserveFeedback(null);
      const res = await submitBusinessReservationToMessages(draft);
      setReserveSubmitting(false);
      if (res.error && !res.conversationId) {
        if (/auth required|invalid token|çaktivizuar/i.test(res.error)) {
          setPendingBusinessReservation(draft);
          router.push(paths.user.auth);
          return;
        }
        setReserveFeedback(res.error);
        return;
      }
      if (res.conversationId) {
        router.push(`${paths.user.messages}?c=${encodeURIComponent(res.conversationId)}`);
        return;
      }
      setReserveFeedback(res.error ?? 'Rezervimi nuk u dërgua.');
      return;
    }
    if (telHref) window.location.href = telHref;
  };

  return (
    <>
      {ownerPreview ? null : <ListingMetricsTracker listingKind="businesses" listingId={listing.id} />}
      <BusinessListingDetailDesktop
        listing={listing}
        similar={ownerPreview ? [] : similar}
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
        reserveNote={reserveNote}
        onReserveGuestName={setReserveGuestName}
        onReserveGuestPhone={setReserveGuestPhone}
        onReserveNote={setReserveNote}
        usePlatformReservation={usePlatformReservation}
        reserveFeedback={reserveFeedback}
        reserveSubmitting={reserveSubmitting || authLoading}
        reserveOpen={reserveOpen}
        onReserveOpen={setReserveOpen}
        onReserve={() => void handleReserve()}
        ownerPreview={ownerPreview}
      />

      <Box
        sx={{
          display: ownerPreview ? 'block' : { xs: 'block', md: 'none' },
          bgcolor: 'background.default',
          minHeight: ownerPreview ? 'auto' : '100vh',
          pb: ownerPreview ? 3 : MOBILE_CONTENT_BOTTOM_PADDING,
        }}
      >
      <Box sx={{ maxWidth: { md: CONTENT_MAX + 32 }, mx: 'auto', width: '100%' }}>
        <RealEstateListingGallery
          title={listing.title}
          imageUrls={listing.imageUrls}
          placeholderIcon={listingDetailGalleryPlaceholder(listing)}
          browseListHref={ownerPreview ? undefined : paths.public.businesses}
          browseListAriaLabel="Prapa te lista e bizneseve"
          listingKind="businesses"
          listingId={listing.id}
          shareCount={ownerPreview ? undefined : listing.shareCount}
          saveCount={ownerPreview ? undefined : saveCount}
          bookmark={ownerPreview ? undefined : { saved, onToggle: () => void toggleSave() }}
          onEditPhotos={ownerEdit?.onEditPhotos}
        />

        <Box sx={{ px: 2, pt: 2, pb: 3, maxWidth: CONTENT_MAX, mx: 'auto', width: '100%', boxSizing: 'border-box' }}>
          <Stack spacing={2.5}>
            {/* Title & meta */}
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography
                  component="h1"
                  sx={{ fontWeight: 800, fontSize: FONT_TITLE, lineHeight: 1.2 }}
                >
                  {listing.title}
                </Typography>
                <BusinessVerifiedBadge />
                {ownerEdit?.onEditInfo ? (
                  <OwnerEditPencil label="Ndrysho titullin dhe të dhënat" onClick={ownerEdit.onEditInfo} />
                ) : null}
              </Stack>

              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontSize: FONT_CAPTION, color: 'text.secondary', lineHeight: 1.4 }}>
                  {categoryLine}
                </Typography>
                {ownerEdit?.onEditInfo ? (
                  <OwnerEditPencil label="Ndrysho kategorinë" onClick={ownerEdit.onEditInfo} />
                ) : null}
              </Stack>

              {listing.cityName || ownerEdit?.onEditInfo ? (
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                  <MapPinIcon size={16} weight="regular" />
                  <Typography sx={{ fontSize: FONT_CAPTION }}>
                    {listing.cityName ? `${listing.cityName}, Shqipëri` : 'Shtoni lokacionin'}
                  </Typography>
                  {ownerEdit?.onEditInfo ? (
                    <OwnerEditPencil label="Ndrysho lokacionin" onClick={ownerEdit.onEditInfo} />
                  ) : null}
                </Stack>
              ) : null}

              <BusinessReviewSection
                variant="summary"
                listingId={listing.id}
                ratingAverage={listing.ratingAverage}
                reviewCount={listing.reviewCount}
                onReviewSubmitted={() => {
                  router.refresh();
                }}
              />

              {statusLine || ownerEdit?.onEditHours ? (
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
                    {statusLine || 'Vendosni orarin'}
                  </Typography>
                  {ownerEdit?.onEditHours ? (
                    <OwnerEditPencil label="Ndrysho orarin" onClick={ownerEdit.onEditHours} />
                  ) : null}
                </Stack>
              ) : null}

              {listing.description || ownerEdit?.onEditInfo ? (
                <Box>
                  {listing.description ? (
                    <RealEstateListingExpandableText
                      text={listing.description}
                      fontSize={FONT_BODY}
                      readMoreLabel="Shiko më shumë"
                      readLessLabel="Shiko më pak"
                    />
                  ) : (
                    <Typography sx={{ fontSize: FONT_BODY, color: 'text.secondary' }}>
                      Shtoni përshkrimin
                    </Typography>
                  )}
                  {ownerEdit?.onEditInfo ? (
                    <Box sx={{ mt: 0.75 }}>
                      <OwnerEditPencil label="Ndrysho përshkrimin" onClick={ownerEdit.onEditInfo} />
                    </Box>
                  ) : null}
                </Box>
              ) : null}
            </Stack>

            {/* Promo */}
            {showReservation && !ownerPreview ? (
              <ButtonBase
                onClick={() => setReserveOpen(true)}
                sx={{ width: '100%', textAlign: 'left', display: 'block', borderRadius: 3 }}
              >
                <BusinessPromoBanner servicesHighlight={listing.servicesHighlight} variant="detail" />
              </ButtonBase>
            ) : null}

            {/* Reservation widget */}
            {showReservation && !ownerPreview ? (
              <Box
                sx={{
                  ...surfaceSx,
                  p: 0,
                  overflow: 'hidden',
                }}
              >
                <ButtonBase
                  onClick={() => setReserveOpen((open) => !open)}
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
                    color: reserveOpen ? 'text.primary' : 'common.black',
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
                      <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY, lineHeight: 1.25 }}>
                        Rezervo tavolinën
                      </Typography>
                      {!reserveOpen && usePlatformReservation ? (
                        <Typography sx={{ fontSize: FONT_CAPTION, opacity: 0.75, lineHeight: 1.3 }}>
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
                        sx={{ fontSize: FONT_CAPTION, mb: 1.5, lineHeight: 1.45 }}
                      >
                        Plotësoni fushat — kërkesa dërgohet si mesazh te biznesi.
                      </Typography>
                    ) : null}
                    <Stack spacing={1.5}>
                      <SearchableSelect
                        size="small"
                        label="Data"
                        value={reserveDate}
                        onChange={setReserveDate}
                        options={dateOptions}
                        emptyLabel="Zgjidhni datën…"
                        clearable={false}
                        sx={selectFieldSx()}
                      />
                      <Stack direction="row" spacing={1.25}>
                        <SearchableSelect
                          size="small"
                          label="Ora"
                          value={reserveTime}
                          onChange={setReserveTime}
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
                          onChange={setReservePeople}
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
                            onChange={(e) => setReserveGuestName(e.target.value)}
                            fullWidth
                            sx={reserveFieldSx}
                          />
                          <TextField
                            size="small"
                            label="Telefoni"
                            value={reserveGuestPhone}
                            onChange={(e) => setReserveGuestPhone(e.target.value)}
                            fullWidth
                            sx={reserveFieldSx}
                          />
                          <TextField
                            size="small"
                            label="Shënim (opsionale)"
                            value={reserveNote}
                            onChange={(e) => setReserveNote(e.target.value)}
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
                        onClick={() => void handleReserve()}
                        disabled={usePlatformReservation ? reserveSubmitting || authLoading : !reserveHref}
                        startIcon={usePlatformReservation ? <ChatsCircleIcon size={18} weight="bold" /> : undefined}
                        sx={{
                          py: 1.35,
                          borderRadius: 999,
                          fontWeight: 800,
                          textTransform: 'none',
                          fontSize: FONT_BODY,
                          boxShadow: 'none',
                          mt: 0.25,
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

            {/* Menu preview — 3 per category, full menu on separate page */}
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Menu</Typography>
                {ownerEdit?.onEditMenu ? (
                  <OwnerEditPencil label="Ndrysho menunë" onClick={ownerEdit.onEditMenu} />
                ) : null}
              </Stack>
              <BusinessMenuPreview listing={listing} maxPerCategory={3} />
            </Box>

            {/* Reviews list */}
            <BusinessReviewSection
              variant="list"
              listingId={listing.id}
              ratingAverage={listing.ratingAverage}
              reviewCount={listing.reviewCount}
              onReviewSubmitted={() => {
                router.refresh();
              }}
            />

            {/* Similar */}
            {!ownerPreview && similar.length > 0 ? (
              <Stack spacing={1.5} sx={{ pt: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Biznese të ngjashme</Typography>
                <ListingsCarousel slotWidth={{ xs: 260, sm: 280, md: 300 }}>
                  {similar.map((item) => (
                    <DirectoryListingCard key={item.id} listing={item} />
                  ))}
                </ListingsCarousel>
              </Stack>
            ) : null}

            {ownerPreview ? null : (
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
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
    </>
  );
}
