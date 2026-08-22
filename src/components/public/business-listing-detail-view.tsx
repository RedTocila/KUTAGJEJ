'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';

import { paths } from '@/paths';
import { hasStoredAccessToken } from '@/lib/auth/storage';
import {
  businessCategorySubtitle,
  businessOpenStatusLine,
  reservationDateBounds,
} from '@/lib/business-listing-detail-content';
import { businessMobileCtaLabel, businessMobileCtaModeFromListing } from '@/lib/business-mobile-cta';
import { setPendingBusinessReservation, submitBusinessReservationToMessages } from '@/lib/business-reservation-message';
import { businessLocationLine, businessMapLocation, scrollToBusinessLocationMap } from '@/lib/google-maps-location';
import { listingDetailGalleryPlaceholder } from '@/lib/listing-gallery-placeholder';
import { emitHotLeadContactAction } from '@/lib/listing-hot-lead';
import { MOBILE_BOTTOM_NAV_OFFSET } from '@/lib/mobile-layout';
import type { PublicDirectoryListing, PublicDirectoryListingDetail } from '@/lib/public-listings-client';
import { useListingBookmark } from '@/hooks/use-listing-bookmark';
import { useUser } from '@/hooks/use-user';
import { BusinessReviewSection } from '@/components/businesses/business-review-section';
import { BusinessListingDetailDesktop } from '@/components/public/business-listing-detail-desktop';
import { BusinessMenuPreview } from '@/components/public/business-menu-section';
import { BusinessOpenStatusLine } from '@/components/public/business-open-status-line';
import { BusinessReservationPanel } from '@/components/public/business-reservation-panel';
import { BusinessStickyMobileCta } from '@/components/public/business-sticky-mobile-cta';
import { BusinessPromoBanner } from '@/components/public/listing-cards/business-promo-banner';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { ListingDetailTitleBadges } from '@/components/public/listing-detail-title-badges';
import { ListingMetricsTracker } from '@/components/public/listing-metrics-tracker';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { LocationMapEmbed } from '@/components/public/location-map-embed';
import { HistoryBackButton } from '@/components/public/product-browse-chrome';
import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { RealEstateListingGallery } from '@/components/public/real-estate-listing-gallery';
import { OwnerEditPencil, type OwnerEditHandlers } from '@/components/user/owner-edit-pencil';
import { OwnerEditableSpot } from '@/components/user/owner-inline-edit';
import { productButtonSx, productPanelSx } from '@/styles/product-sx';

const FONT_BODY = '0.875rem';
const FONT_CAPTION = '0.75rem';
const FONT_TITLE = '1.375rem';

const CONTENT_MAX = 480;

const surfaceSx = {
  ...productPanelSx,
  p: 2,
} as const;

export function BusinessListingDetailView({
  listing,
  canonicalUrl,
  similar = [],
  similarSlot,
  similarSlotDesktop,
  ownerPreview = false,
  ownerEdit,
}: {
  listing: PublicDirectoryListingDetail;
  /** Reserved for metadata / future share overrides. */
  canonicalUrl?: string;
  similar?: PublicDirectoryListing[];
  similarSlot?: React.ReactNode;
  similarSlotDesktop?: React.ReactNode;
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
    ]
  );
  const locationLine = React.useMemo(
    () =>
      businessLocationLine({
        locationAddress: listing.locationAddress,
        zoneName: listing.zoneName,
        cityName: listing.cityName,
      }),
    [listing.cityName, listing.locationAddress, listing.zoneName]
  );

  const showReservation = listing.reservationsEnabled;
  const usePlatformReservation = showReservation;
  const mobileCtaMode = businessMobileCtaModeFromListing(listing);
  const reservePrimaryCta = mobileCtaMode === 'reserve';

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

      const hasToken = typeof window !== 'undefined' && hasStoredAccessToken();
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

  const reservationPanelProps = {
    open: reserveOpen,
    onOpenChange: setReserveOpen,
    reserveDate,
    onReserveDate: setReserveDate,
    reservePeople,
    onReservePeople: setReservePeople,
    reserveGuestName,
    onReserveGuestName: setReserveGuestName,
    reserveGuestPhone,
    onReserveGuestPhone: setReserveGuestPhone,
    reserveNote,
    onReserveNote: setReserveNote,
    usePlatformReservation,
    reserveFeedback,
    reserveSubmitting: reserveSubmitting || authLoading,
    onReserve: () => void handleReserve(),
    telHref,
  } as const;

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
        similar={ownerPreview || similarSlotDesktop ? [] : similar}
        similarSlot={ownerPreview ? undefined : similarSlotDesktop}
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
          pb: ownerPreview ? 3 : `calc(80px + ${MOBILE_BOTTOM_NAV_OFFSET})`,
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
            sharePayload={
              ownerPreview
                ? undefined
                : {
                    title: listing.title,
                    category: categoryLine || listing.categoryLabel,
                    imageUrl: listing.imageUrls[0] ?? listing.imageUrl,
                    location: locationLine || listing.cityName || undefined,
                    contactPhone: phone?.trim() || undefined,
                    createdAt: listing.createdAt,
                    viewCount: listing.viewCount,
                    saveCount,
                    ratingAverage: listing.ratingAverage,
                    reviewCount: listing.reviewCount,
                    url: canonicalUrl,
                  }
            }
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
                  <Typography component="h1" sx={{ fontWeight: 800, fontSize: FONT_TITLE, lineHeight: 1.2 }}>
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

                {ownerEdit?.editingField === 'location' ? null : locationLine ? (
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
                      gap: 0.75,
                      flexWrap: 'wrap',
                      justifyContent: 'flex-start',
                      color: 'text.primary',
                      borderRadius: 1,
                      textAlign: 'left',
                      maxWidth: '100%',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    <MapPinIcon size={16} weight="regular" />
                    <Typography sx={{ fontSize: FONT_CAPTION }}>{locationLine}</Typography>
                  </ButtonBase>
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
                  <BusinessOpenStatusLine
                    listing={listing}
                    statusLine={statusLine || 'Vendosni orarin'}
                    fontSize={FONT_CAPTION}
                    endAdornment={
                      ownerEdit?.onEditHours ? (
                        <OwnerEditPencil label="Ndrysho orarin" onClick={ownerEdit.onEditHours} />
                      ) : null
                    }
                  />
                ) : null}
              </Stack>

              {ownerEdit ? (
                <OwnerEditableSpot
                  field="mobileCta"
                  ownerEdit={ownerEdit}
                  label="Ndrysho butonin kryesor"
                  align="flex-start"
                  sx={{ width: '100%', flexDirection: 'column', alignItems: 'stretch' }}
                >
                  {mobileCtaMode === 'none' ? (
                    <Box
                      sx={{
                        width: '100%',
                        py: 1.5,
                        px: 2,
                        borderRadius: 999,
                        border: '1.5px dashed',
                        borderColor: 'divider',
                        bgcolor: 'action.hover',
                        textAlign: 'center',
                      }}
                    >
                      <Typography sx={{ fontSize: FONT_CAPTION, fontWeight: 700, color: 'text.secondary' }}>
                        {businessMobileCtaLabel(mobileCtaMode)} — pa buton në mobile
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ width: '100%', pointerEvents: 'none' }}>
                      <BusinessStickyMobileCta
                        listingId={listing.id}
                        listingTitle={listing.title}
                        contactPhone={phone}
                        listingUrl={canonicalUrl}
                        mobileCtaMode={listing.mobileCtaMode}
                        reservationsEnabled={listing.reservationsEnabled}
                        reservationPanel={reservePrimaryCta ? reservationPanelProps : undefined}
                      />
                    </Box>
                  )}
                </OwnerEditableSpot>
              ) : (
                <BusinessStickyMobileCta
                  listingId={listing.id}
                  listingTitle={listing.title}
                  contactPhone={phone}
                  listingUrl={canonicalUrl}
                  mobileCtaMode={listing.mobileCtaMode}
                  reservationsEnabled={listing.reservationsEnabled}
                  reservationPanel={reservePrimaryCta ? reservationPanelProps : undefined}
                />
              )}

              {listing.description || ownerEdit?.onStartInlineEdit || ownerEdit?.onEditInfo ? (
                <Stack spacing={0.75} sx={{ width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden' }}>
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
                  {ownerEdit?.editingField === 'description' &&
                  ownerEdit.inlineEditors?.description ? null : listing.description ? (
                    <RealEstateListingExpandableText
                      text={listing.description}
                      fontSize={FONT_BODY}
                      readMoreLabel="Shiko më shumë"
                      readLessLabel="Shiko më pak"
                    />
                  ) : (
                    <Typography sx={{ fontSize: FONT_BODY, color: 'text.secondary' }}>Shtoni përshkrimin</Typography>
                  )}
                </Stack>
              ) : null}

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

              {/* Reservation widget — only when reserve is not the primary mobile CTA */}
              {showReservation && !ownerPreview && !reservePrimaryCta ? (
                <BusinessReservationPanel {...reservationPanelProps} />
              ) : null}

              {/* Menu preview — 4 visible rows, scroll for more; full menu on separate page */}
              <Box>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
                >
                  <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Menu</Typography>
                  {ownerEdit?.onEditMenu ? (
                    <OwnerEditPencil label="Ndrysho menunë" onClick={ownerEdit.onEditMenu} />
                  ) : null}
                </Stack>
                <BusinessMenuPreview listing={listing} maxPerCategory={3} />
              </Box>

              {mapLocation || ownerEdit?.onStartInlineEdit ? (
                <Stack
                  data-business-location-map
                  spacing={1}
                  component="section"
                  aria-labelledby="business-location-heading"
                  sx={{ scrollMarginTop: 80 }}
                >
                  {ownerEdit?.editingField === 'location' && ownerEdit.inlineEditors?.location ? (
                    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>{ownerEdit.inlineEditors.location}</Box>
                  ) : (
                    <>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <Typography id="business-location-heading" sx={{ fontWeight: 800, fontSize: FONT_BODY }}>
                          Vendndodhja
                        </Typography>
                        {ownerEdit?.onStartInlineEdit ? (
                          <OwnerEditPencil
                            label="Ndrysho lokacionin"
                            onClick={() => ownerEdit.onStartInlineEdit!('location')}
                          />
                        ) : null}
                      </Stack>
                      {mapLocation ? (
                        <LocationMapEmbed query={mapLocation.query} lat={mapLocation.lat} lng={mapLocation.lng} />
                      ) : (
                        <Typography sx={{ fontSize: FONT_CAPTION, color: 'text.secondary' }}>
                          Shtoni qytetin, lagjen ose linkun e Google Maps.
                        </Typography>
                      )}
                    </>
                  )}
                </Stack>
              ) : null}

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
              {!ownerPreview && similarSlot ? (
                similarSlot
              ) : !ownerPreview && similar.length > 0 ? (
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
    </>
  );
}
