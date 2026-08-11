'use client';

import * as React from 'react';
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
import { ListingDetailTitleBadges } from '@/components/public/listing-detail-title-badges';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';

import { ReservationDateField } from '@/components/core/reservation-date-field';
import { HistoryBackButton } from '@/components/public/product-browse-chrome';
import { BusinessMenuPreview } from '@/components/public/business-menu-section';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { BusinessPromoBanner } from '@/components/public/listing-cards/business-promo-banner';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { RealEstateListingGallery } from '@/components/public/real-estate-listing-gallery';
import {
  businessCategorySubtitle,
  businessOpenStatusLine,
  reservationDateBounds,
} from '@/lib/business-listing-detail-content';
import {
  setPendingBusinessReservation,
  submitBusinessReservationToMessages,
} from '@/lib/business-reservation-message';
import { BusinessReviewSection } from '@/components/businesses/business-review-section';
import { listingDetailGalleryPlaceholder } from '@/lib/listing-gallery-placeholder';
import type { PublicDirectoryListing, PublicDirectoryListingDetail } from '@/lib/public-listings-client';
import { BusinessListingDetailDesktop } from '@/components/public/business-listing-detail-desktop';
import { StickyListingContact } from '@/components/public/sticky-listing-contact';
import { MOBILE_BOTTOM_NAV_OFFSET } from '@/lib/mobile-layout';
import { paths } from '@/paths';
import { ListingMetricsTracker } from '@/components/public/listing-metrics-tracker';
import { OwnerEditPencil, type OwnerEditHandlers } from '@/components/user/owner-edit-pencil';
import { OwnerEditableSpot } from '@/components/user/owner-inline-edit';
import { useListingBookmark } from '@/hooks/use-listing-bookmark';
import { useUser } from '@/hooks/use-user';
import { emitHotLeadContactAction } from '@/lib/listing-hot-lead';
import { productButtonSx, productFieldSx, productPanelSx } from '@/styles/product-sx';

const FONT_BODY = '0.875rem';
const FONT_CAPTION = '0.75rem';
const FONT_TITLE = '1.375rem';

const CONTENT_MAX = 480;

const surfaceSx = {
  ...productPanelSx,
  p: 2,
} as const;

const reserveFieldSx = {
  ...productFieldSx,
  '& .MuiOutlinedInput-root': {
    ...productFieldSx['& .MuiOutlinedInput-root'],
    fontSize: FONT_BODY,
    fontWeight: 600,
  },
  '& .MuiInputLabel-root': { fontSize: FONT_CAPTION, fontWeight: 600 },
} as const;

export function BusinessListingDetailView({
  listing,
  canonicalUrl,
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
  const dateBounds = React.useMemo(() => reservationDateBounds(), []);

  const showReservation = listing.reservationsEnabled;
  const usePlatformReservation = showReservation;

  React.useEffect(() => {
    if (!reserveDate) setReserveDate(dateBounds.min);
  }, [dateBounds.min, reserveDate]);

  const handleReserve = async () => {
    if (usePlatformReservation) {
      const name = reserveGuestName.trim();
      const phone = reserveGuestPhone.trim();
      const partySize = Number.parseInt(reservePeople, 10);
      if (!reserveDate) {
        setReserveFeedback('Zgjidhni datën.');
        return;
      }
      if (!Number.isInteger(partySize) || partySize < 1 || partySize > 50) {
        setReserveFeedback('Shkruani numrin e mysafirëve (1–50).');
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

      emitHotLeadContactAction({ listingKind: 'businesses', listingId: listing.id });

      const draft = {
        listingId: listing.id,
        guestName: name,
        guestPhone: phone,
        partySize,
        reservationDate: reserveDate,
        timeSlot: '',
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
    if (telHref) {
      emitHotLeadContactAction({ listingKind: 'businesses', listingId: listing.id });
      window.location.href = telHref;
    }
  };

  return (
    <>
      {ownerPreview ? null : (
        <ListingMetricsTracker
          listingKind="businesses"
          listingId={listing.id}
          city={listing.cityName}
          category={listing.category}
          ownerId={listing.seller?.id}
          photoCount={listing.imageUrls?.filter(Boolean).length ?? 0}
        />
      )}
      <BusinessListingDetailDesktop
        listing={listing}
        similar={ownerPreview ? [] : similar}
        saved={saved}
        saveCount={saveCount}
        onToggleSave={() => void toggleSave()}
        showReservation={showReservation}
        reserveDate={reserveDate}
        reservePeople={reservePeople}
        onReserveDate={setReserveDate}
        onReservePeople={setReservePeople}
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
        canonicalUrl={canonicalUrl}
        ownerPreview={ownerPreview}
      />

      <Box
        sx={{
          display: ownerPreview ? 'block' : { xs: 'block', md: 'none' },
          bgcolor: 'background.default',
          minHeight: ownerPreview ? 'auto' : '100vh',
          pb: ownerPreview
            ? 3
            : `calc(80px + ${MOBILE_BOTTOM_NAV_OFFSET})`,
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
              <OwnerEditableSpot
                field="title"
                ownerEdit={ownerEdit}
                label="Ndrysho titullin"
                legacyOnClick={ownerEdit?.onEditInfo}
                align="flex-start"
              >
                <Typography
                  component="h1"
                  sx={{ fontWeight: 800, fontSize: FONT_TITLE, lineHeight: 1.2 }}
                >
                  {listing.title}
                  <ListingDetailTitleBadges
                    verified={Boolean(listing.seller?.verified)}
                    trustBadge={Boolean(listing.seller?.trustBadge)}
                    verifiedLabel="Biznes i verifikuar"
                  />
                </Typography>
              </OwnerEditableSpot>

              <OwnerEditableSpot
                field="category"
                ownerEdit={ownerEdit}
                label="Ndrysho kategorinë"
                legacyOnClick={ownerEdit?.onEditInfo}
              >
                <Typography sx={{ fontSize: FONT_CAPTION, color: 'text.secondary', lineHeight: 1.4 }}>
                  {categoryLine}
                </Typography>
              </OwnerEditableSpot>

              {listing.cityName || ownerEdit?.onStartInlineEdit || ownerEdit?.onEditInfo ? (
                <OwnerEditableSpot
                  field="location"
                  ownerEdit={ownerEdit}
                  label="Ndrysho lokacionin"
                  legacyOnClick={ownerEdit?.onEditInfo}
                >
                  <MapPinIcon size={16} weight="regular" />
                  <Typography sx={{ fontSize: FONT_CAPTION }}>
                    {listing.cityName ? `${listing.cityName}, Shqipëri` : 'Shtoni lokacionin'}
                  </Typography>
                </OwnerEditableSpot>
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

              {listing.description || ownerEdit?.onStartInlineEdit || ownerEdit?.onEditInfo ? (
                <Stack spacing={0.75}>
                  <OwnerEditableSpot
                    field="description"
                    ownerEdit={ownerEdit}
                    label="Ndrysho përshkrimin"
                    legacyOnClick={ownerEdit?.onEditInfo}
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
                      Përshkrimi
                    </Typography>
                  </OwnerEditableSpot>
                  {ownerEdit?.editingField === 'description' && ownerEdit.inlineEditors?.description ? null : listing.description ? (
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
                </Stack>
              ) : null}
            </Stack>

            {/* Promo announcement */}
            {listing.announcementTitle?.trim() && !ownerPreview ? (
              showReservation ? (
                <ButtonBase
                  onClick={() => setReserveOpen(true)}
                  sx={{ width: '100%', textAlign: 'left', display: 'block', borderRadius: 3 }}
                >
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
                      <ReservationDateField
                        size="small"
                        label="Data"
                        value={reserveDate}
                        onChange={setReserveDate}
                        emptyLabel="Zgjidhni datën…"
                        sx={reserveFieldSx}
                      />
                      <TextField
                        size="small"
                        label="Numri i mysafirëve"
                        type="number"
                        value={reservePeople}
                        onChange={(e) => setReservePeople(e.target.value)}
                        slotProps={{ htmlInput: { min: 1, max: 50, inputMode: 'numeric' } }}
                        fullWidth
                        sx={reserveFieldSx}
                      />
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
                        disabled={usePlatformReservation ? reserveSubmitting || authLoading : !telHref}
                        startIcon={usePlatformReservation ? <ChatsCircleIcon size={18} weight="bold" /> : undefined}
                        sx={{
                          ...productButtonSx,
                          py: 1.35,
                          fontSize: FONT_BODY,
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

            {/* Menu preview — 4 visible rows, scroll for more; full menu on separate page */}
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Menu</Typography>
                {ownerEdit?.onEditMenu ? (
                  <OwnerEditPencil label="Ndrysho menunë" onClick={ownerEdit.onEditMenu} />
                ) : null}
              </Stack>
              <BusinessMenuPreview listing={listing} maxPerCategory={4} />
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
                <HistoryBackButton href={paths.public.businesses} sx={{ fontSize: FONT_BODY }}>
                  Kthehu te lista e bizneseve
                </HistoryBackButton>
              </Box>
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
      {ownerPreview ? null : (
        <StickyListingContact
          listingKind="businesses"
          listingId={listing.id}
          contactPhone={phone}
          listingTitle={listing.title}
          listingUrl={canonicalUrl}
        />
      )}
    </>
  );
}
