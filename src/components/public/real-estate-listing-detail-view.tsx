'use client';

import * as React from 'react';
import Link from 'next/link';
import { alpha, Box, Button, ButtonBase, Container, Divider, Paper, Stack, Typography } from '@mui/material';
import { Bathtub as BathtubIcon } from '@phosphor-icons/react/dist/ssr/Bathtub';
import { Bed as BedIcon } from '@phosphor-icons/react/dist/ssr/Bed';
import { Calendar as CalendarIcon } from '@phosphor-icons/react/dist/ssr/Calendar';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { Lightning as LightningIcon } from '@phosphor-icons/react/dist/ssr/Lightning';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Phone as PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';
import { Ruler as RulerIcon } from '@phosphor-icons/react/dist/ssr/Ruler';
import { Stairs as StairsIcon } from '@phosphor-icons/react/dist/ssr/Stairs';
import { WhatsappLogo as WhatsappLogoIcon } from '@phosphor-icons/react/dist/ssr/WhatsappLogo';

import { paths } from '@/paths';
import { businessLocationLine, businessMapLocation, scrollToBusinessLocationMap } from '@/lib/google-maps-location';
import { whatsappInquireHref as buildWhatsappInquireHref, whatsappInquireText } from '@/lib/listing-contact';
import { LISTING_DETAIL_HERO_GALLERY_MAX_WIDTH_PX, LISTING_DETAIL_HERO_IMAGE_SIZES } from '@/lib/listing-detail-layout';
import type { PublicRealEstateListing, PublicRealEstateListingDetail } from '@/lib/public-listings-client';
import { useListingBookmark } from '@/hooks/use-listing-bookmark';
import { formatPrice, postedLabelSq } from '@/components/public/listing-cards/format-helpers';
import { ListingPrice } from '@/components/public/listing-cards/listing-price';
import { RealEstateCard } from '@/components/public/listing-cards/real-estate-card';
import { ListingDetailTitleBadges } from '@/components/public/listing-detail-title-badges';
import { ListingMessageButton } from '@/components/public/listing-message-button';
import { ListingMetricsTracker } from '@/components/public/listing-metrics-tracker';
import { ListingSellerProfileCard } from '@/components/public/listing-seller-profile-card';
import { ListingVerifiedNotice } from '@/components/public/listing-verified-notice';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { LocationMapEmbed } from '@/components/public/location-map-embed';
import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { RealEstateListingGallery } from '@/components/public/real-estate-listing-gallery';
import { StickyListingContact } from '@/components/public/sticky-listing-contact';
import { whatsappOutlinedButtonSx } from '@/components/public/whatsapp-outlined-button-sx';
import { OwnerEditPencil, type OwnerEditHandlers } from '@/components/user/owner-edit-pencil';
import { OwnerEditableSpot } from '@/components/user/owner-inline-edit';
import { productButtonSx, productPanelSx } from '@/styles/product-sx';

const CONDITION_SQ: Record<string, string> = {
  new: 'E re',
  'in-construction': 'Në ndërtim',
  renovated: 'E rinovuar',
  'good-condition': 'Në gjendje të mirë',
};

const FURNISH_SQ: Record<string, string> = {
  furnished: 'Mobiluar',
  unfurnished: 'Pa mobilim',
  'partially-furnished': 'Pjesërisht i mobiluar',
  'kitchen-only': 'Mobilimi: vetëm kuzhinë',
};

function propertyCategoryLabelSq(slug: string): string {
  const m: Record<string, string> = {
    apartment: 'Apartament',
    villa: 'Vilë',
    'penthouse-duplex': 'Penthouse / duplex',
    'part-of-villa': 'Pjesë vile',
    'room-studio-attic': 'Dhomë / studio / mansardë',
    parking: 'Parkim',
    shop: 'Dyqan',
    office: 'Zyre',
    'industrial-shed': 'Hapësirë industriale',
    'commercial-local': 'Ambient komercial',
    warehouse: 'Depo',
    'business-space': 'Ambient biznesi',
    'building-plot': 'Truall ndërtimi',
    'agricultural-land': 'Tokë bujqësore',
  };
  return m[slug] ?? slug.replace(/-/g, ' ');
}

function sectionTitle(text: string, id: string, edit?: { label: string; onClick: () => void }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
      <Typography
        id={id}
        component="h2"
        variant="overline"
        sx={{
          letterSpacing: '0.14em',
          fontWeight: 800,
          color: 'text.secondary',
        }}
      >
        {text}
      </Typography>
      {edit ? <OwnerEditPencil label={edit.label} onClick={edit.onClick} /> : null}
    </Stack>
  );
}

function SpecIconBox({ Icon, primary, secondary }: { Icon: typeof BedIcon; primary: string; secondary: string }) {
  return (
    <Stack spacing={1} sx={{ alignItems: 'center', flex: '1 1 0', minWidth: 0, px: { xs: 0.75, sm: 1 }, py: 1.25 }}>
      <Box sx={{ color: 'primary.main', opacity: 0.95, display: 'inline-flex', lineHeight: 0 }}>
        <Icon weight="regular" color="currentColor" size={24} aria-hidden />
      </Box>
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.9rem', textAlign: 'center' }}
      >
        {primary}
      </Typography>
      <Typography
        variant="caption"
        sx={{ fontWeight: 500, color: 'text.secondary', fontSize: '0.72rem', textAlign: 'center' }}
      >
        {secondary}
      </Typography>
    </Stack>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, py: 1 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', flex: '1 1 40%', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, flex: '1 1 60%', textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  );
}

/** Çmimi, etiketa transaksioni, lokacion + butonat “Kontakto/WhatsApp” (kolona në të njëjtin rresht me galerinë për `md+`). */
function RealEstatePriceContactAside(props: {
  listing: PublicRealEstateListingDetail;
  transactionLabel: string;
  locationFull: string | null;
  displayPhone: string;
  whatsappInquireHref?: string | null;
  canonicalUrl?: string;
}) {
  const { listing, transactionLabel, locationFull, displayPhone, whatsappInquireHref, canonicalUrl } = props;

  return (
    <Stack spacing={2}>
      <Stack spacing={0.75}>
        <ListingPrice
          price={listing.price}
          originalPrice={listing.originalPrice}
          currency={listing.currency}
          isPremium={listing.isPremium}
          isOkazion={listing.isOkazion}
          fontSize="1.9rem"
          fontWeight={950}
          suffix={
            listing.transactionType === 'rent' ? (
              <Typography component="span" variant="body2" sx={{ ml: 0.5, fontWeight: 600, color: 'text.secondary' }}>
                / muaj
              </Typography>
            ) : null
          }
        />
        {transactionLabel ? (
        <Paper
          variant="outlined"
          sx={{
            alignSelf: 'flex-start',
            borderColor: 'divider',
            bgcolor: 'action.hover',
            borderRadius: 999,
            px: 1.25,
            py: 0.35,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main' }}>
            {transactionLabel}
          </Typography>
        </Paper>
        ) : null}
        {locationFull ? (
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
              alignItems: 'flex-start',
              gap: 0.65,
              maxWidth: '100%',
              color: 'text.secondary',
              borderRadius: 1,
              textAlign: 'left',
              '&:hover': { color: 'primary.main' },
            }}
          >
            <Box
              sx={{
                color: 'primary.main',
                opacity: 0.9,
                display: 'inline-flex',
                flexShrink: 0,
                lineHeight: 0,
                pt: 0.35,
              }}
            >
              <MapPinIcon size={17} weight="regular" color="currentColor" aria-hidden />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.45 }}>
              {locationFull}
            </Typography>
          </ButtonBase>
        ) : null}
      </Stack>
      <Divider flexItem />
      <Stack spacing={1.25} data-listing-contact="">
        {displayPhone ? (
          <>
            <Button
              component="a"
              href={`tel:${displayPhone.replace(/\s/g, '')}`}
              variant="contained"
              disableElevation
              fullWidth
              size="large"
              startIcon={<PhoneIcon weight="regular" size={22} />}
              sx={{ ...productButtonSx, py: 1.2 }}
            >
              Kontakto shitësin
            </Button>
            {whatsappInquireHref ? (
              <Button
                component="a"
                href={whatsappInquireHref}
                rel="noopener noreferrer"
                target="_blank"
                variant="outlined"
                fullWidth
                size="large"
                startIcon={<WhatsappLogoIcon weight="regular" size={22} />}
                sx={{
                  ...productButtonSx,
                  py: 1.2,
                  ...whatsappOutlinedButtonSx,
                }}
              >
                WhatsApp
              </Button>
            ) : null}
            <ListingMessageButton
              listingKind="real-estate"
              listingId={listing.id}
              contactPhone={displayPhone}
              listingTitle={listing.title}
              listingUrl={canonicalUrl}
              variant="outlined"
              fullWidth
              size="large"
              sx={{
                ...productButtonSx,
                py: 1.2,
                borderColor: 'divider',
                borderWidth: 2,
                color: 'text.primary',
                '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
              }}
            />
          </>
        ) : (
          <Button variant="contained" disabled fullWidth size="large" sx={productButtonSx}>
            Nr. kontakti i padisponueshëm
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

function RealEstateSellerCardContents({
  listing,
  sellerSectionHeadingId,
  cardSx,
}: {
  listing: PublicRealEstateListingDetail;
  /** Unique `id` for the heading (hero + scroll panels both render in the DOM). */
  sellerSectionHeadingId?: string;
  cardSx?: React.ComponentProps<typeof ListingSellerProfileCard>['cardSx'];
}) {
  return <ListingSellerProfileCard seller={listing.seller} headingId={sellerSectionHeadingId} cardSx={cardSx} />;
}

function StickyContactBar(props: {
  listingId: string;
  contactPhone: string;
  listingTitle: string;
  listingUrl: string;
}) {
  return (
    <StickyListingContact
      listingKind="real-estate"
      listingId={props.listingId}
      contactPhone={props.contactPhone}
      listingTitle={props.listingTitle}
      listingUrl={props.listingUrl}
    />
  );
}

export function RealEstateListingDetailView({
  listing,
  similar = [],
  similarSlot,
  canonicalUrl,
  ownerPreview = false,
  ownerEdit,
}: {
  listing: PublicRealEstateListingDetail;
  similar?: PublicRealEstateListing[];
  /** Streamed similar carousel — rendered instead of `similar` when set. */
  similarSlot?: React.ReactNode;
  canonicalUrl: string;
  /** Owner edit canvas — hide buyer chrome (contact, similar, metrics). */
  ownerPreview?: boolean;
  ownerEdit?: OwnerEditHandlers;
}) {
  const onEditInfo = ownerEdit?.onEditInfo;
  const onEditPrice = ownerEdit?.onEditPrice ?? onEditInfo;
  const onEditSpecs = ownerEdit?.onEditSpecs ?? onEditInfo;
  const canInline = Boolean(ownerEdit?.onStartInlineEdit);
  const locationFull = React.useMemo(
    () =>
      businessLocationLine({
        locationAddress: listing.locationAddress,
        zoneName: listing.zoneName,
        cityName: listing.cityName,
      }),
    [listing.cityName, listing.locationAddress, listing.zoneName]
  );
  const mapLocation = React.useMemo(
    () =>
      businessMapLocation({
        locationLat: listing.locationLat,
        locationLng: listing.locationLng,
        mapsUrl: listing.mapsUrl,
        zoneName: listing.zoneName,
        cityName: listing.cityName,
      }),
    [listing.cityName, listing.locationLat, listing.locationLng, listing.mapsUrl, listing.zoneName]
  );
  const displayPhone = listing.contactPhone?.trim() || listing.seller?.phone?.trim() || '';

  const viewCount = listing.viewCount ?? 0;
  const { saved, saveCount, toggleSave } = useListingBookmark('real-estate', listing.id, {
    saved: listing.saved,
    saveCount: listing.saveCount,
  });

  const transactionLabel =
    listing.transactionType === 'rent' ? 'Qera' : listing.transactionType === 'sale' ? 'Shitje' : '';
  const whatsappInquireHref = buildWhatsappInquireHref(displayPhone, whatsappInquireText(listing.title, canonicalUrl));

  const priceLabel =
    formatPrice(listing.price, listing.currency) + (listing.transactionType === 'rent' ? ' / muaj' : '');

  const sharePayload = {
    title: listing.title,
    category: propertyCategoryLabelSq(listing.propertyCategory),
    priceLabel,
    badge: transactionLabel,
    imageUrl: listing.imageUrls[0] ?? listing.imageUrl ?? null,
    location: [listing.zoneName, listing.cityName].filter(Boolean).join(', ') || undefined,
    specs: [
      ...(listing.bedrooms != null ? [{ icon: 'bed' as const, label: `${listing.bedrooms}` }] : []),
      ...(listing.bathrooms != null ? [{ icon: 'bath' as const, label: `${listing.bathrooms}` }] : []),
      ...(listing.surfaceM2 != null && Number(listing.surfaceM2) > 0
        ? [{ icon: 'ruler' as const, label: `${listing.surfaceM2} m²` }]
        : []),
      ...(listing.floor != null ? [{ icon: 'stairs' as const, label: `Kati ${listing.floor}` }] : []),
      ...(listing.yearBuilt != null ? [{ icon: 'calendar' as const, label: String(listing.yearBuilt) }] : []),
      ...(listing.furnishing
        ? [{ icon: 'couch' as const, label: FURNISH_SQ[listing.furnishing] ?? listing.furnishing }]
        : []),
    ],
    createdAt: listing.createdAt,
    viewCount,
    saveCount: listing.saveCount,
    contactPhone: displayPhone || undefined,
    url: canonicalUrl,
  };

  const detailRows: Array<{ label: string; value: string } | null> = [
    listing.propertyCategory ? { label: 'Lloji', value: propertyCategoryLabelSq(listing.propertyCategory) } : null,
    listing.condition ? { label: 'Gjendja', value: CONDITION_SQ[listing.condition] ?? listing.condition } : null,
    listing.yearBuilt != null ? { label: 'Viti ndërtimit', value: String(listing.yearBuilt) } : null,
    listing.furnishing ? { label: 'Mobilimi', value: FURNISH_SQ[listing.furnishing] ?? listing.furnishing } : null,
    listing.floor != null ? { label: 'Kati i apartamentit', value: `${listing.floor}` } : null,
    listing.totalFloors != null ? { label: 'Numri i katëve të ndërtesës', value: `${listing.totalFloors}` } : null,
    listing.parkingFloor != null ? { label: 'Kati i parkimit', value: `${listing.parkingFloor}` } : null,
  ];

  const featureChips: string[] = [];
  if (listing.furnishing) featureChips.push(FURNISH_SQ[listing.furnishing] ?? listing.furnishing);
  if (listing.condition) featureChips.push(CONDITION_SQ[listing.condition] ?? listing.condition);

  return (
    <>
      {ownerPreview ? null : (
        <ListingMetricsTracker
          listingKind="real-estate"
          listingId={listing.id}
          city={listing.cityName}
          category={listing.propertyCategory}
          ownerId={listing.seller?.id}
          photoCount={listing.imageUrls?.filter(Boolean).length ?? 0}
        />
      )}
      {/* JSON-LD is emitted from the route; keep article semantics for headings + listing body. */}
      <Box component="article" sx={{ bgcolor: 'background.default' }}>
        <Container
          maxWidth="lg"
          sx={{
            px: { xs: 0, md: 3 },
            pt: { md: 2 },
            pb: { xs: 0, md: 2 },
            bgcolor: 'background.default',
          }}
        >
          <Stack spacing={{ xs: 0, md: 4 }}>
            <Box
              sx={(theme) => ({
                width: '100%',
                borderRadius: { xs: 0, md: 3 },
                overflow: 'hidden',
                bgcolor: 'background.paper',
                border: 'none',
                boxShadow: {
                  xs: 'none',
                  md:
                    theme.palette.mode === 'dark'
                      ? `0 20px 50px ${alpha(theme.palette.common.black, 0.35)}`
                      : theme.shadows[6],
                },
              })}
            >
              <Stack
                direction={ownerPreview ? 'column' : { xs: 'column', md: 'row' }}
                sx={{ alignItems: { md: 'stretch' }, minHeight: 0, width: '100%' }}
              >
                <Box
                  sx={{
                    flex: { md: `1 1 ${LISTING_DETAIL_HERO_GALLERY_MAX_WIDTH_PX}px` },
                    maxWidth: { md: LISTING_DETAIL_HERO_GALLERY_MAX_WIDTH_PX },
                    minWidth: 0,
                    width: '100%',
                    overflow: 'hidden',
                  }}
                >
                  <RealEstateListingGallery
                    title={listing.title}
                    imageUrls={listing.imageUrls}
                    placeholderIcon={
                      listing.propertyCategory === 'villa' || listing.propertyCategory === 'part-of-villa'
                        ? 'house'
                        : 'buildings'
                    }
                    browseListHref={ownerPreview ? undefined : paths.public.realEstate}
                    browseListAriaLabel="Prapa te lista e pronës"
                    heroSizes={LISTING_DETAIL_HERO_IMAGE_SIZES}
                    listingKind="real-estate"
                    listingId={listing.id}
                    shareCount={ownerPreview ? undefined : listing.shareCount}
                    saveCount={ownerPreview ? undefined : saveCount}
                    bookmark={ownerPreview ? undefined : { saved, onToggle: () => void toggleSave() }}
                    sharePayload={ownerPreview ? undefined : sharePayload}
                    onEditPhotos={ownerEdit?.onEditPhotos}
                  />
                </Box>
                <Box
                  sx={{
                    display: ownerPreview ? 'none' : { xs: 'none', md: 'flex' },
                    flexDirection: 'column',
                    flex: '0 0 auto',
                    width: { md: 'min(340px, 34%)' },
                    minWidth: { md: 280 },
                    maxWidth: { md: 380 },
                    bgcolor: 'background.paper',
                    p: 2.5,
                    justifyContent: 'flex-start',
                    alignSelf: { md: 'stretch' },
                  }}
                >
                  <Stack spacing={2} sx={{ width: '100%' }}>
                    <RealEstatePriceContactAside
                      listing={listing}
                      transactionLabel={transactionLabel}
                      locationFull={locationFull}
                      displayPhone={displayPhone}
                      whatsappInquireHref={whatsappInquireHref}
                      canonicalUrl={canonicalUrl}
                    />
                    <Divider flexItem sx={{ borderColor: 'rgba(var(--mui-palette-dividerChannel) / 0.35)' }} />
                    <RealEstateSellerCardContents
                      sellerSectionHeadingId="re-seller-heading-hero"
                      listing={listing}
                      cardSx={{
                        ...productPanelSx,
                        border: 'none',
                        p: 2,
                        borderRadius: 2.5,
                      }}
                    />
                  </Stack>
                </Box>
              </Stack>
            </Box>

            <Stack
              spacing={{ xs: 3, md: 3.5 }}
              sx={{ px: { xs: 2, sm: 3, md: 0 }, pb: ownerPreview ? 3 : { xs: 14, md: 6 }, width: '100%' }}
            >
              <Stack spacing={1.75}>
                <OwnerEditableSpot
                  field="title"
                  ownerEdit={ownerEdit}
                  label="Ndrysho titullin"
                  legacyOnClick={onEditInfo}
                  align="flex-start"
                >
                  <Typography
                    variant="h3"
                    component="h1"
                    sx={{
                      fontWeight: 800,
                      lineHeight: 1.18,
                      letterSpacing: '-0.02em',
                      color: 'text.primary',
                      fontSize: { xs: '1.55rem', sm: '2rem', md: '2.125rem' },
                    }}
                  >
                    {listing.title}
                    <ListingDetailTitleBadges
                      verified={Boolean(listing.seller?.verified)}
                      trustBadge={Boolean(listing.seller?.trustBadge)}
                    />
                  </Typography>
                </OwnerEditableSpot>

                <Box sx={{ display: ownerPreview ? 'block' : { xs: 'block', md: 'none' } }}>
                  <OwnerEditableSpot
                    field="price"
                    ownerEdit={ownerEdit}
                    label="Ndrysho çmimin"
                    legacyOnClick={onEditPrice}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <ListingPrice
                        price={listing.price}
                        originalPrice={listing.originalPrice}
                        currency={listing.currency}
                        isPremium={listing.isPremium}
                        isOkazion={listing.isOkazion}
                        fontSize="1.85rem"
                        fontWeight={900}
                        suffix={
                          listing.transactionType === 'rent' ? (
                            <Typography
                              component="span"
                              variant="subtitle2"
                              sx={{ ml: 0.5, fontWeight: 600, color: 'text.secondary' }}
                            >
                              / muaj
                            </Typography>
                          ) : null
                        }
                      />
                      {transactionLabel ? (
                      <Paper
                        variant="outlined"
                        sx={{
                          borderColor: 'divider',
                          bgcolor: 'action.hover',
                          borderRadius: 999,
                          px: 1.25,
                          py: 0.35,
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main' }}>
                          {transactionLabel}
                        </Typography>
                      </Paper>
                      ) : null}
                    </Stack>
                  </OwnerEditableSpot>
                </Box>

                <Stack spacing={1.25}>
                  {locationFull || canInline || onEditInfo ? (
                    <OwnerEditableSpot
                      field="location"
                      ownerEdit={ownerEdit}
                      label="Ndrysho lokacionin"
                      legacyOnClick={onEditInfo}
                    >
                      {locationFull ? (
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
                            gap: 0.65,
                            color: 'text.secondary',
                            borderRadius: 1,
                            textAlign: 'left',
                            maxWidth: '100%',
                            '&:hover': { color: 'primary.main' },
                          }}
                        >
                          <Box sx={{ color: 'primary.main', opacity: 0.9, display: 'inline-flex', lineHeight: 0 }}>
                            <MapPinIcon size={17} weight="regular" color="currentColor" />
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.4 }}>
                            {locationFull}
                          </Typography>
                        </ButtonBase>
                      ) : (
                        <>
                          <Box sx={{ color: 'primary.main', opacity: 0.9, display: 'inline-flex', lineHeight: 0 }}>
                            <MapPinIcon size={17} weight="regular" color="currentColor" />
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{ color: 'text.secondary', fontWeight: 600, lineHeight: 1.4 }}
                          >
                            Shtoni lokacionin
                          </Typography>
                        </>
                      )}
                    </OwnerEditableSpot>
                  ) : null}
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                    <Stack
                      direction="row"
                      spacing={0.55}
                      sx={{ alignItems: 'center', color: 'text.secondary', minWidth: 0 }}
                    >
                      <CalendarIcon size={17} weight="regular" aria-hidden />
                      <Typography variant="body2">{postedLabelSq(listing.createdAt)}</Typography>
                    </Stack>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{ alignItems: 'center', color: 'text.secondary', flexShrink: 0 }}
                    >
                      <EyeIcon size={17} weight="regular" aria-hidden />
                      <Typography variant="body2">
                        {new Intl.NumberFormat('sq-AL').format(viewCount)}
                      </Typography>
                    </Stack>
                  </Stack>
                </Stack>
              </Stack>

              <Stack spacing={1} sx={{ width: '100%' }}>
                {ownerPreview ? null : (
                  <StickyContactBar
                    listingId={listing.id}
                    contactPhone={displayPhone}
                    listingTitle={listing.title}
                    listingUrl={canonicalUrl}
                  />
                )}
                <ListingVerifiedNotice verified={Boolean(listing.seller?.verified)} />
              </Stack>

              <Stack spacing={1.25}>
                <OwnerEditableSpot
                  field="specs"
                  ownerEdit={ownerEdit}
                  label="Ndrysho specifikimet"
                  legacyOnClick={onEditSpecs}
                >
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ fontWeight: 800, letterSpacing: '0.1em' }}
                  >
                    Përmbledhje
                  </Typography>
                </OwnerEditableSpot>
                {ownerEdit?.editingField === 'specs' && ownerEdit.inlineEditors?.specs ? null : (
                  <Paper
                    variant="outlined"
                    sx={{
                      borderRadius: 2.5,
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      px: { xs: 1, sm: 1.5 },
                      py: { xs: 1.75, sm: 2 },
                    }}
                  >
                    <Stack direction="row" sx={{ flexWrap: 'wrap', justifyContent: 'space-evenly', rowGap: 1 }}>
                      {listing.bedrooms != null ? (
                        <SpecIconBox
                          Icon={BedIcon}
                          primary={`${listing.bedrooms}`}
                          secondary={listing.bedrooms === 1 ? 'Dhomë gjumi' : 'Dhoma gjumi'}
                        />
                      ) : null}
                      {listing.bathrooms != null ? (
                        <SpecIconBox
                          Icon={BathtubIcon}
                          primary={`${listing.bathrooms}`}
                          secondary={listing.bathrooms === 1 ? 'Tualet' : 'Tualete'}
                        />
                      ) : null}
                      {listing.surfaceM2 != null && Number(listing.surfaceM2) > 0 ? (
                        <SpecIconBox Icon={RulerIcon} primary={`${listing.surfaceM2} m²`} secondary="Sipërfaqe" />
                      ) : null}
                      {listing.propertyCategory === 'parking' && listing.parkingFloor != null ? (
                        <SpecIconBox Icon={CarIcon} primary={`Kati ${listing.parkingFloor}`} secondary="Parkim" />
                      ) : listing.totalFloors != null ? (
                        <SpecIconBox
                          Icon={StairsIcon}
                          primary={`${listing.totalFloors}`}
                          secondary={listing.totalFloors === 1 ? 'Kat' : 'Kata'}
                        />
                      ) : listing.floor != null ? (
                        <SpecIconBox Icon={StairsIcon} primary={`Kat ${listing.floor}`} secondary="Niveli" />
                      ) : null}
                    </Stack>
                  </Paper>
                )}
              </Stack>

              <Stack spacing={2} component="section" aria-labelledby="re-desc-heading">
                <OwnerEditableSpot
                  field="description"
                  ownerEdit={ownerEdit}
                  label="Ndrysho përshkrimin"
                  legacyOnClick={onEditSpecs}
                >
                  <Typography
                    id="re-desc-heading"
                    component="h2"
                    variant="overline"
                    sx={{
                      letterSpacing: '0.14em',
                      fontWeight: 800,
                      color: 'text.secondary',
                    }}
                  >
                    Përshkrimi
                  </Typography>
                </OwnerEditableSpot>
                {ownerEdit?.editingField === 'description' &&
                ownerEdit.inlineEditors?.description ? null : listing.description ? (
                  <RealEstateListingExpandableText text={listing.description} />
                ) : canInline || onEditSpecs ? (
                  <Typography sx={{ color: 'text.secondary' }}>Shtoni përshkrimin</Typography>
                ) : null}
              </Stack>

              <Stack spacing={0} component="section" aria-labelledby="re-detail-heading">
                {sectionTitle(
                  'Detajet',
                  're-detail-heading',
                  canInline || onEditSpecs
                    ? {
                        label: 'Ndrysho detajet',
                        onClick: () =>
                          ownerEdit?.onStartInlineEdit ? ownerEdit.onStartInlineEdit('specs') : onEditSpecs?.(),
                      }
                    : undefined
                )}
                {ownerEdit?.editingField === 'specs' && ownerEdit.inlineEditors?.specs ? null : (
                  <Stack divider={<Divider flexItem />} spacing={0}>
                    {detailRows.filter(Boolean).map((row) => (
                      <DetailRow key={row!.label} label={row!.label} value={row!.value} />
                    ))}
                  </Stack>
                )}
              </Stack>

              {featureChips.length ? (
                <Stack spacing={1.5} component="section" aria-labelledby="re-amen-heading">
                  {sectionTitle('Veçoritë kryesore', 're-amen-heading')}
                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {featureChips.map((label) => (
                      <Paper
                        key={label}
                        variant="outlined"
                        sx={{
                          borderRadius: 15,
                          px: 1.5,
                          py: 0.85,
                          bgcolor: 'action.hover',
                          borderColor: 'divider',
                        }}
                      >
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                          <Box sx={{ color: 'primary.main', display: 'inline-flex', lineHeight: 0 }}>
                            <LightningIcon size={14} weight="regular" color="currentColor" aria-hidden />
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 650, fontSize: '0.8125rem' }}>
                            {label}
                          </Typography>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Stack>
              ) : null}

              <Box sx={{ display: ownerPreview ? 'block' : { xs: 'block', md: 'none' } }}>
                <RealEstateSellerCardContents sellerSectionHeadingId="re-seller-heading-scroll" listing={listing} />
              </Box>

              {mapLocation || canInline || onEditInfo ? (
                <Stack
                  data-business-location-map
                  spacing={1.5}
                  component="section"
                  aria-labelledby="re-loc-heading"
                  sx={{ scrollMarginTop: 80 }}
                >
                  {sectionTitle('Vendndodhja', 're-loc-heading')}
                  {mapLocation ? (
                    <LocationMapEmbed query={mapLocation.query} lat={mapLocation.lat} lng={mapLocation.lng} />
                  ) : (
                    <Typography sx={{ color: 'text.secondary' }}>
                      Shtoni qytetin, lagjen ose linkun e Google Maps.
                    </Typography>
                  )}
                </Stack>
              ) : null}

              {!ownerPreview && similarSlot ? (
                similarSlot
              ) : !ownerPreview && similar.length > 0 ? (
                <>
                  <Divider sx={{ borderColor: 'divider' }} />
                  <Stack spacing={2} component="aside" aria-labelledby="re-related-heading">
                    {sectionTitle('Prona të ngjashme', 're-related-heading')}
                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: '-0.5rem !important' }}>
                      Lista e përditësuar automatikisht.
                    </Typography>
                    <Box
                      sx={{
                        mx: { xs: -2, sm: -3, md: 0 },
                        px: { xs: 2, sm: 3, md: 0 },
                        '& > div > div': { py: '8px 0 0 !important' },
                      }}
                    >
                      <ListingsCarousel>
                        {similar.map((s) => (
                          <RealEstateCard key={s.id} listing={s} />
                        ))}
                      </ListingsCarousel>
                    </Box>
                  </Stack>
                </>
              ) : null}
            </Stack>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
