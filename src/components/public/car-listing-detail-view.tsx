'use client';

import * as React from 'react';
import { Box, Button, ButtonBase, Chip, Container, Divider, Paper, Stack, Typography } from '@mui/material';
import { Calendar as CalendarIcon } from '@phosphor-icons/react/dist/ssr/Calendar';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { GasPump as GasPumpIcon } from '@phosphor-icons/react/dist/ssr/GasPump';
import { Gauge as GaugeIcon } from '@phosphor-icons/react/dist/ssr/Gauge';
import { GearSix as GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Phone as PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';
import { WhatsappLogo as WhatsappLogoIcon } from '@phosphor-icons/react/dist/ssr/WhatsappLogo';

import { paths } from '@/paths';
import { CAR_COLOUR_OPTIONS, FUEL_TYPE_OPTIONS, TRANSMISSION_OPTIONS, vehicleTypeLabel } from '@/lib/car-constants';
import { businessLocationLine, businessMapLocation, scrollToBusinessLocationMap } from '@/lib/google-maps-location';
import { whatsappInquireHref as buildWhatsappInquireHref, whatsappInquireText } from '@/lib/listing-contact';
import { LISTING_DETAIL_HERO_GALLERY_MAX_WIDTH_PX, LISTING_DETAIL_HERO_IMAGE_SIZES } from '@/lib/listing-detail-layout';
import type { PublicCarListing, PublicCarListingDetail } from '@/lib/public-listings-client';
import { useListingBookmark } from '@/hooks/use-listing-bookmark';
import { useListingViewCount } from '@/hooks/use-listing-view-count';
import { CarCard } from '@/components/public/listing-cards/car-card';
import {
  findOptionLabel,
  formatKilometers,
  formatPrice,
  postedLabelSq,
} from '@/components/public/listing-cards/format-helpers';
import { ListingPrice } from '@/components/public/listing-cards/listing-price';
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

const FUEL_SQ: Record<string, string> = {
  petrol: 'Benzinë',
  diesel: 'Dizel',
  electric: 'Elektrike',
  ethanol: 'Etanol',
  'hybrid-diesel': 'Hibrid dizel',
  'hybrid-petrol': 'Hibrid benzinë',
  hydrogen: 'Hidrogjen',
  lpg: 'LPG',
  'natural-gas': 'Gaz natyror',
  'plugin-hybrid': 'Plug-in hibrid',
  other: 'Tjetër',
};

const TRANSMISSION_SQ: Record<string, string> = {
  automatic: 'Automatik',
  manual: 'Manual',
};

const COLOUR_SQ: Record<string, string> = {
  beige: 'Bezhë',
  blue: 'Blu',
  brown: 'Kafe',
  yellow: 'E verdhë',
  gold: 'E artë',
  green: 'E gjelbër',
  grey: 'Gri',
  orange: 'Portokalli',
  red: 'E kuqe',
  black: 'E zezë',
  silver: 'Argjendi',
  purple: 'Vjollcë',
  white: 'E bardhë',
};

const FINISH_SQ: Record<string, string> = {
  matte: 'Mat',
  metallic: 'Metalik',
};

function fuelLabel(value: string): string {
  return FUEL_SQ[value] ?? findOptionLabel(FUEL_TYPE_OPTIONS, value);
}

function transmissionLabel(value: string): string {
  return TRANSMISSION_SQ[value] ?? findOptionLabel(TRANSMISSION_OPTIONS, value);
}

function colourLabel(value: string): string {
  return COLOUR_SQ[value] ?? findOptionLabel(CAR_COLOUR_OPTIONS, value);
}

function sectionTitle(text: string, id: string, edit?: { label: string; onClick: () => void }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
      <Typography
        id={id}
        component="h2"
        variant="overline"
        sx={{ letterSpacing: '0.14em', fontWeight: 800, color: 'text.secondary' }}
      >
        {text}
      </Typography>
      {edit ? <OwnerEditPencil label={edit.label} onClick={edit.onClick} /> : null}
    </Stack>
  );
}

function SpecIconBox({ Icon, primary, secondary }: { Icon: typeof CalendarIcon; primary: string; secondary: string }) {
  return (
    <Stack
      spacing={0.65}
      sx={{
        alignItems: 'center',
        justifyContent: 'flex-start',
        flex: '1 1 0',
        minWidth: 0,
        px: { xs: 0.75, sm: 1.25 },
        py: 0.25,
      }}
    >
      <Box
        sx={{
          width: 28,
          height: 28,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
          lineHeight: 0,
          flexShrink: 0,
        }}
      >
        <Icon weight="regular" color="currentColor" size={22} aria-hidden />
      </Box>
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 800,
          color: 'text.primary',
          fontSize: { xs: '0.8rem', sm: '0.9rem' },
          textAlign: 'center',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
        }}
      >
        {primary}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 500,
          color: 'text.secondary',
          fontSize: '0.68rem',
          textAlign: 'center',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
        }}
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

function CarPriceContactAside(props: {
  listing: PublicCarListingDetail;
  locationFull: string | null;
  displayPhone: string;
  whatsappInquireHref?: string | null;
  canonicalUrl?: string;
}) {
  const { listing, locationFull, displayPhone, whatsappInquireHref, canonicalUrl } = props;

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
        />
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {[listing.make, listing.model, listing.variant].filter(Boolean).join(' ')}
        </Typography>
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
              listingKind="cars"
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

export function CarListingDetailView({
  listing,
  similar = [],
  similarSlot,
  canonicalUrl,
  ownerPreview = false,
  ownerEdit,
}: {
  listing: PublicCarListingDetail;
  similar?: PublicCarListing[];
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
        cityName: listing.cityName,
      }),
    [listing.cityName, listing.locationAddress]
  );
  const mapLocation = React.useMemo(
    () =>
      businessMapLocation({
        locationLat: listing.locationLat,
        locationLng: listing.locationLng,
        mapsUrl: listing.mapsUrl,
        cityName: listing.cityName,
      }),
    [listing.cityName, listing.locationLat, listing.locationLng, listing.mapsUrl]
  );
  const displayPhone = listing.contactPhone?.trim() || listing.seller?.phone?.trim() || '';
  const { viewCount, onViewed } = useListingViewCount(listing.id, listing.viewCount ?? 0);
  const { saved, saveCount, toggleSave } = useListingBookmark('car', listing.id, {
    saved: listing.saved,
    saveCount: listing.saveCount,
  });

  const fuel = fuelLabel(listing.fuelType);
  const transmission = transmissionLabel(listing.transmission);
  const colour = colourLabel(listing.color);

  const whatsappInquireHref = buildWhatsappInquireHref(displayPhone, whatsappInquireText(listing.title, canonicalUrl));

  const sharePayload = {
    title: listing.title,
    category: listing.make,
    priceLabel: formatPrice(listing.price, listing.currency),
    badge: String(listing.year),
    imageUrl: listing.imageUrls[0] ?? listing.imageUrl ?? null,
    location: locationFull || listing.cityName || undefined,
    specs: [
      ...(listing.year != null ? [{ icon: 'calendar' as const, label: String(listing.year) }] : []),
      ...(listing.kilometers != null
        ? [{ icon: 'gauge' as const, label: formatKilometers(listing.kilometers) }]
        : []),
      ...(fuel ? [{ icon: 'gas' as const, label: fuel }] : []),
      ...(transmission ? [{ icon: 'gear' as const, label: transmission }] : []),
      ...(listing.color && colour ? [{ icon: 'paint' as const, label: colour }] : []),
    ],
    createdAt: listing.createdAt,
    viewCount,
    saveCount: listing.saveCount,
    contactPhone: displayPhone || undefined,
    url: canonicalUrl,
  };

  const detailRows: Array<{ label: string; value: string }> = [
    ...(listing.vehicleType ? [{ label: 'Kategoria', value: vehicleTypeLabel(listing.vehicleType) }] : []),
    { label: 'Markë', value: listing.make },
    { label: 'Model', value: listing.model },
    ...(listing.variant ? [{ label: 'Variant', value: listing.variant }] : []),
    ...(listing.year != null ? [{ label: 'Viti', value: String(listing.year) }] : []),
    ...(listing.kilometers != null ? [{ label: 'Kilometrazhi', value: formatKilometers(listing.kilometers) }] : []),
    ...(transmission ? [{ label: 'Transmision', value: transmission }] : []),
    ...(fuel ? [{ label: 'Karburant', value: fuel }] : []),
    ...(colour ? [{ label: 'Ngjyra', value: colour }] : []),
    ...(listing.cityName ? [{ label: 'Qyteti', value: listing.cityName }] : []),
  ];

  const hasExtras = Boolean(listing.extras?.length || listing.finish?.length);

  return (
    <>
      {ownerPreview ? null : (
        <ListingMetricsTracker
          listingKind="car"
          listingId={listing.id}
          city={listing.cityName}
          category={listing.make}
          ownerId={listing.seller?.id}
          photoCount={listing.imageUrls?.filter(Boolean).length ?? 0}
          onViewed={onViewed}
        />
      )}
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
                  md: theme.palette.mode === 'dark' ? '0 20px 50px rgba(0, 0, 0, 0.35)' : theme.shadows[6],
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
                    placeholderIcon="car"
                    browseListHref={ownerPreview ? undefined : paths.public.cars}
                    browseListAriaLabel="Prapa te lista e makinave"
                    heroSizes={LISTING_DETAIL_HERO_IMAGE_SIZES}
                    listingKind="car"
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
                    <CarPriceContactAside
                      listing={listing}
                      locationFull={locationFull}
                      displayPhone={displayPhone}
                      whatsappInquireHref={whatsappInquireHref}
                      canonicalUrl={canonicalUrl}
                    />
                    <Divider flexItem sx={{ borderColor: 'rgba(var(--mui-palette-dividerChannel) / 0.35)' }} />
                    <ListingSellerProfileCard
                      seller={listing.seller}
                      headingId="car-seller-heading-hero"
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
                      verified={Boolean(listing.seller?.verified ?? listing.sellerVerified)}
                      trustBadge={Boolean(listing.seller?.trustBadge ?? listing.sellerTrustBadge)}
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
                    <ListingPrice
                      price={listing.price}
                      originalPrice={listing.originalPrice}
                      currency={listing.currency}
                      isPremium={listing.isPremium}
                      isOkazion={listing.isOkazion}
                      fontSize="1.85rem"
                      fontWeight={900}
                    />
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
                  <StickyListingContact
                    listingKind="cars"
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
                  <Box
                    sx={{
                      ...productPanelSx,
                      borderRadius: 2.5,
                      px: { xs: 0.5, sm: 0.75 },
                      py: { xs: 1.5, sm: 1.75 },
                    }}
                  >
                    <Stack
                      direction="row"
                      divider={
                        <Divider
                          orientation="vertical"
                          flexItem
                          sx={{ borderColor: 'rgba(var(--mui-palette-dividerChannel) / 0.55)', my: 0.5 }}
                        />
                      }
                      sx={{ alignItems: 'stretch', width: '100%' }}
                    >
                      {listing.year != null ? (
                        <SpecIconBox Icon={CalendarIcon} primary={String(listing.year)} secondary="Viti" />
                      ) : null}
                      {listing.kilometers != null ? (
                      <SpecIconBox
                        Icon={GaugeIcon}
                        primary={formatKilometers(listing.kilometers).replace(' ', '\u00A0')}
                        secondary="Kilometra"
                      />
                      ) : null}
                      {fuel ? <SpecIconBox Icon={GasPumpIcon} primary={fuel} secondary="Karburant" /> : null}
                      {transmission ? <SpecIconBox Icon={GearSixIcon} primary={transmission} secondary="Transmision" /> : null}
                    </Stack>
                  </Box>
                )}
              </Stack>

              <Stack spacing={1.25} component="section" aria-labelledby="car-desc-heading">
                <OwnerEditableSpot
                  field="description"
                  ownerEdit={ownerEdit}
                  label="Ndrysho përshkrimin"
                  legacyOnClick={onEditSpecs}
                >
                  <Typography
                    id="car-desc-heading"
                    component="h2"
                    variant="overline"
                    sx={{ letterSpacing: '0.14em', fontWeight: 800, color: 'text.secondary' }}
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

              <Stack spacing={1.25} component="section" aria-labelledby="car-details-heading">
                {sectionTitle(
                  'Detajet',
                  'car-details-heading',
                  canInline || onEditSpecs
                    ? {
                        label: 'Ndrysho detajet',
                        onClick: () =>
                          ownerEdit?.onStartInlineEdit ? ownerEdit.onStartInlineEdit('specs') : onEditSpecs?.(),
                      }
                    : undefined
                )}
                {ownerEdit?.editingField === 'specs' && ownerEdit.inlineEditors?.specs ? null : (
                  <Paper
                    variant="outlined"
                    sx={{ borderRadius: 2.5, borderColor: 'divider', bgcolor: 'background.paper', px: 2, py: 0.5 }}
                  >
                    <Stack divider={<Divider flexItem />} spacing={0}>
                      {detailRows.map((row) => (
                        <DetailRow key={`${row.label}-${row.value}`} label={row.label} value={row.value} />
                      ))}
                    </Stack>
                  </Paper>
                )}
              </Stack>

              {hasExtras || canInline || onEditSpecs ? (
                <Stack spacing={1.25} component="section" aria-labelledby="car-extras-heading">
                  {sectionTitle(
                    'Ekstra',
                    'car-extras-heading',
                    canInline || onEditSpecs
                      ? {
                          label: 'Ndrysho ekstrat',
                          onClick: () =>
                            ownerEdit?.onStartInlineEdit ? ownerEdit.onStartInlineEdit('specs') : onEditSpecs?.(),
                        }
                      : undefined
                  )}
                  {ownerEdit?.editingField === 'specs' && ownerEdit.inlineEditors?.specs ? null : hasExtras ? (
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                      {listing.finish?.map((f) => (
                        <Chip
                          key={f}
                          size="small"
                          label={FINISH_SQ[f] ?? String(f)}
                          sx={{ bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.12)', fontWeight: 700 }}
                        />
                      ))}
                      {listing.extras?.map((e) => (
                        <Chip key={e} size="small" label={String(e)} variant="outlined" sx={{ fontWeight: 600 }} />
                      ))}
                    </Stack>
                  ) : (
                    <Typography sx={{ color: 'text.secondary' }}>Shtoni finish ose ekstra</Typography>
                  )}
                </Stack>
              ) : null}

              {mapLocation || canInline || onEditInfo ? (
                <Stack
                  data-business-location-map
                  spacing={1.25}
                  component="section"
                  aria-labelledby="car-location-heading"
                  sx={{ scrollMarginTop: 80 }}
                >
                  {sectionTitle('Vendndodhja', 'car-location-heading')}
                  {mapLocation ? (
                    <LocationMapEmbed query={mapLocation.query} lat={mapLocation.lat} lng={mapLocation.lng} />
                  ) : (
                    <Typography sx={{ color: 'text.secondary' }}>Shtoni qytetin ose linkun e Google Maps.</Typography>
                  )}
                </Stack>
              ) : null}

              <Box sx={{ display: ownerPreview ? 'block' : { xs: 'block', md: 'none' } }}>
                <ListingSellerProfileCard seller={listing.seller} headingId="car-seller-heading-mobile" />
              </Box>

              {!ownerPreview && similarSlot ? (
                similarSlot
              ) : !ownerPreview && similar.length ? (
                <Stack spacing={1.5} component="aside" aria-labelledby="car-similar-heading">
                  <Divider />
                  {sectionTitle('Automjete të fundit', 'car-similar-heading')}
                  <Box
                    sx={{
                      mx: { xs: -2, sm: -3, md: 0 },
                      // Match cancelled Stack padding so the first card aligns with the title.
                      px: { xs: 2, sm: 3, md: 0 },
                      '& > div > div': { py: '8px 0 0 !important' },
                    }}
                  >
                    <ListingsCarousel>
                      {similar.map((s) => (
                        <CarCard key={s.id} listing={s} />
                      ))}
                    </ListingsCarousel>
                  </Box>
                </Stack>
              ) : null}
            </Stack>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
