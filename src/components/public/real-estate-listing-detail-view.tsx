'use client';

import * as React from 'react';
import {
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
  alpha,
} from '@mui/material';
import { Bathtub as BathtubIcon } from '@phosphor-icons/react/dist/ssr/Bathtub';
import { Bed as BedIcon } from '@phosphor-icons/react/dist/ssr/Bed';
import { Calendar as CalendarIcon } from '@phosphor-icons/react/dist/ssr/Calendar';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { Couch as CouchIcon } from '@phosphor-icons/react/dist/ssr/Couch';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { Lightning as LightningIcon } from '@phosphor-icons/react/dist/ssr/Lightning';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Phone as PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';
import { Ruler as RulerIcon } from '@phosphor-icons/react/dist/ssr/Ruler';
import { Stairs as StairsIcon } from '@phosphor-icons/react/dist/ssr/Stairs';
import { WhatsappLogo as WhatsappLogoIcon } from '@phosphor-icons/react/dist/ssr/WhatsappLogo';

import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { RealEstateListingGallery } from '@/components/public/real-estate-listing-gallery';
import { whatsappOutlinedButtonSx } from '@/components/public/whatsapp-outlined-button-sx';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { RealEstateCard } from '@/components/public/listing-cards/real-estate-card';
import { formatPrice, pseudoRandomMetric, relativeAlbanianDate } from '@/components/public/listing-cards/format-helpers';
import { whatsappHref } from '@/lib/listing-contact';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import type { PublicRealEstateListing, PublicRealEstateListingDetail } from '@/lib/public-listings-client';
import { paths } from '@/paths';

import {
  LISTING_DETAIL_HERO_GALLERY_MAX_WIDTH_PX,
  LISTING_DETAIL_HERO_IMAGE_SIZES,
} from '@/lib/listing-detail-layout';
import { MOBILE_BOTTOM_NAV_OFFSET } from '@/lib/mobile-layout';

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

function calendarDay(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function postedLabelSq(iso: string): string {
  const d = new Date(iso);
  if (calendarDay(d) === calendarDay(new Date())) return 'Postuar sot';
  return relativeAlbanianDate(iso);
}

function sellerInitials(name: string): string {
  const p = name.split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return `${p[0][0]}${p[1][0]}`.toUpperCase();
}

function sectionTitle(text: string, id: string) {
  return (
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
  );
}

function SpecIconBox({
  Icon,
  primary,
  secondary,
}: {
  Icon: typeof BedIcon;
  primary: string;
  secondary: string;
}) {
  return (
    <Stack spacing={1} sx={{ alignItems: 'center', flex: '1 1 0', minWidth: 0, px: { xs: 0.75, sm: 1 }, py: 1.25 }}>
      <Box sx={{ color: 'primary.main', opacity: 0.95, display: 'inline-flex', lineHeight: 0 }}>
        <Icon weight="regular" color="currentColor" size={24} aria-hidden />
      </Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.9rem', textAlign: 'center' }}>
        {primary}
      </Typography>
      <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary', fontSize: '0.72rem', textAlign: 'center' }}>
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
  locationFull: string;
  displayPhone: string;
  whatsappInquireHref?: string | null;
}) {
  const { listing, transactionLabel, locationFull, displayPhone, whatsappInquireHref } = props;

  return (
    <Stack spacing={2}>
      <Stack spacing={0.75}>
        <Typography sx={{ fontWeight: 950, fontSize: '1.9rem', color: 'primary.main', lineHeight: 1.08 }}>
          {formatPrice(listing.price, listing.currency)}
          {listing.transactionType === 'rent' ? (
            <Typography component="span" variant="body2" sx={{ ml: 0.5, fontWeight: 600, color: 'text.secondary' }}>
              / muaj
            </Typography>
          ) : null}
        </Typography>
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
        {locationFull ? (
          <Stack direction="row" spacing={0.65} sx={{ alignItems: 'flex-start', maxWidth: '100%' }}>
            <Box sx={{ color: 'primary.main', opacity: 0.9, display: 'inline-flex', flexShrink: 0, lineHeight: 0, pt: 0.35 }}>
              <MapPinIcon size={17} weight="regular" color="currentColor" aria-hidden />
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, lineHeight: 1.45 }}>
              {locationFull}
            </Typography>
          </Stack>
        ) : null}
      </Stack>
      <Divider flexItem />
      <Stack spacing={1.25}>
        {displayPhone ? (
          <>
            <Button
              component="a"
              href={`tel:${displayPhone.replace(/\s/g, '')}`}
              variant="contained"
              disableElevation
              fullWidth
              size="large"
              startIcon={<ChatsCircleIcon weight="regular" size={22} />}
              sx={{ borderRadius: 2, fontWeight: 800, textTransform: 'none', py: 1.2 }}
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
                  borderRadius: 2,
                  fontWeight: 800,
                  textTransform: 'none',
                  py: 1.2,
                  ...whatsappOutlinedButtonSx,
                }}
              >
                WhatsApp
              </Button>
            ) : null}
          </>
        ) : (
          <Button variant="contained" disabled fullWidth size="large" sx={{ borderRadius: 2 }}>
            Nr. kontakti i padisponueshëm
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

function RealEstateSellerCardContents({
  listing,
  displayPhone,
  sellerSectionHeadingId,
}: {
  listing: PublicRealEstateListingDetail;
  displayPhone: string;
  /** Unique `id` for the heading (hero + scroll panels both render in the DOM). */
  sellerSectionHeadingId?: string;
}) {
  const whatsappListingHref = (() => {
    const wa = whatsappHref(displayPhone);
    return wa ? `${wa}?text=${encodeURIComponent(`Përshëndetje, për njoftimin «${listing.title}» në KuTaGjej.`)}` : undefined;
  })();
  const memberYear = listing.seller?.memberSince ? new Date(listing.seller.memberSince).getFullYear() : undefined;

  return (
    <>
      <Typography
        id={sellerSectionHeadingId}
        variant="overline"
        color="text.secondary"
        sx={{ fontWeight: 800, letterSpacing: '0.1em', mb: 1.5, display: 'block' }}
      >
        Rreth shitësit / ofertuesit
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <Avatar
          sx={{
            width: { xs: 64, sm: 72 },
            height: { xs: 64, sm: 72 },
            bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.16 : 0.12),
            color: 'primary.main',
            fontWeight: 800,
            fontSize: '1.35rem',
          }}
          aria-hidden
        >
          {sellerInitials(listing.seller?.displayName ?? 'KuTa')}
        </Avatar>
        <Stack spacing={0.65} sx={{ flex: '1 1 auto' }}>
          <Typography sx={{ fontWeight: 850, fontSize: '1.125rem', color: 'text.primary' }}>
            {listing.seller?.displayName ?? 'Përdorues KuTaGjej'}
          </Typography>
          {memberYear != null ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Anëtar që prej {memberYear}
            </Typography>
          ) : null}
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, opacity: 0.85 }}>
            Komuniko vetëm nëpërmjet platformës ose në numrin e listuar.
          </Typography>
        </Stack>
      </Stack>
      <Stack spacing={1.25} sx={{ mt: { xs: 2, sm: 2.25 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
          <Button
            component={displayPhone ? 'a' : 'button'}
            href={displayPhone ? `tel:${displayPhone.replace(/\s/g, '')}` : undefined}
            disabled={!displayPhone}
            variant="contained"
            disableElevation
            fullWidth
            startIcon={<PhoneIcon weight="regular" size={20} />}
            sx={{ borderRadius: 2, fontWeight: 800, textTransform: 'none', py: 1.15 }}
          >
            Telefon
          </Button>
          <Button
            component="a"
            href={whatsappListingHref ?? '#'}
            rel="noopener noreferrer"
            disabled={!whatsappListingHref}
            target="_blank"
            variant="contained"
            disableElevation
            fullWidth
            startIcon={<WhatsappLogoIcon weight="regular" size={20} />}
            sx={{
              borderRadius: 2,
              fontWeight: 800,
              textTransform: 'none',
              py: 1.15,
            }}
          >
            WhatsApp
          </Button>
        </Stack>
        <Button
          component="a"
          href={whatsappListingHref ?? '#'}
          rel="noopener noreferrer"
          target="_blank"
          disabled={!whatsappListingHref}
          variant="outlined"
          fullWidth
          startIcon={<CouchIcon weight="regular" size={20} />}
          sx={{
            borderRadius: 2,
            fontWeight: 800,
            textTransform: 'none',
            py: 1.15,
            borderColor: 'divider',
            borderWidth: 2,
            color: 'text.primary',
            '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
          }}
        >
          Dërgo mesazh
        </Button>
      </Stack>
    </>
  );
}

function StickyContactBar(props: { phone?: string | null; whatsappInquireHref: string | undefined | null }) {
  const { phone, whatsappInquireHref } = props;
  return (
    <Box
      sx={{
        display: { xs: 'flex', md: 'none' },
        position: 'fixed',
        left: 0,
        right: 0,
        zIndex: 1200,
        bottom: {
          xs: MOBILE_BOTTOM_NAV_OFFSET,
          md: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        },
        justifyContent: 'center',
        px: { xs: 1.5, sm: 3 },
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ width: '100%', maxWidth: 560 }}>
        {phone ? (
          <Button
            component="a"
            href={`tel:${phone.replace(/\s/g, '')}`}
            variant="contained"
            disableElevation
            size="large"
            startIcon={<ChatsCircleIcon weight="regular" size={22} />}
            sx={{
              flex: 1,
              borderRadius: 2,
              fontWeight: 800,
              textTransform: 'none',
              fontSize: '1rem',
              py: 1.35,
            }}
          >
            Kontakto shitësin
          </Button>
        ) : (
          <Button variant="contained" disabled sx={{ flex: 1 }}>
            Nr. kontakti i padisponueshëm
          </Button>
        )}
        {whatsappInquireHref ? (
          <Button
            component="a"
            href={whatsappInquireHref}
            rel="noopener noreferrer"
            target="_blank"
            variant="outlined"
            size="large"
            sx={{
              px: 1.85,
              minWidth: 'auto',
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
  );
}

export function RealEstateListingDetailView({
  listing,
  similar,
  canonicalUrl,
}: {
  listing: PublicRealEstateListingDetail;
  similar: PublicRealEstateListing[];
  canonicalUrl: string;
}) {
  const locationFull = [listing.zoneName, listing.cityName, 'Shqipëri'].filter(Boolean).join(', ');
  const displayPhone =
    listing.contactPhone?.trim() || listing.seller?.phone?.trim() || '';

  const viewCount = pseudoRandomMetric(`re-detail:${listing.id}:${listing.updatedAt}`, 120, 9800);

  const transactionLabel = listing.transactionType === 'rent' ? 'Me qira' : 'Për shitje';
  const wa = whatsappHref(displayPhone);

  const whatsappInquireHref = wa
    ? `${wa}?text=${encodeURIComponent(`Përshëndetje, jam i interesuari për: «${listing.title}» (${canonicalUrl}).`)}`
    : undefined;

  const mapLink =
    locationFull.length > 0
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationFull)}`
      : null;

  const detailRows: Array<{ label: string; value: string } | null> = [
    { label: 'Lloji', value: propertyCategoryLabelSq(listing.propertyCategory) },
    listing.condition ? { label: 'Gjendja', value: CONDITION_SQ[listing.condition] ?? listing.condition } : null,
    listing.yearBuilt != null ? { label: 'Viti ndërtimit', value: String(listing.yearBuilt) } : null,
    listing.furnishing
      ? { label: 'Mobilimi', value: FURNISH_SQ[listing.furnishing] ?? listing.furnishing }
      : null,
    listing.floor != null ? { label: 'Kati i apartamentit', value: `${listing.floor}` } : null,
    listing.totalFloors != null ? { label: 'Numri i katëve të ndërtesës', value: `${listing.totalFloors}` } : null,
    listing.parkingFloor != null ? { label: 'Kati i parkimit', value: `${listing.parkingFloor}` } : null,
  ];

  const featureChips: string[] = [];
  if (listing.furnishing) featureChips.push(FURNISH_SQ[listing.furnishing] ?? listing.furnishing);
  if (listing.condition) featureChips.push(CONDITION_SQ[listing.condition] ?? listing.condition);

  return (
    <>
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
              direction={{ xs: 'column', md: 'row' }}
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
                    listing.propertyCategory === 'villa' || listing.propertyCategory === 'part-of-villa' ? 'house' : 'buildings'
                  }
                  browseListHref={paths.public.realEstate}
                  browseListAriaLabel="Prapa te lista e pronës"
                  heroSizes={LISTING_DETAIL_HERO_IMAGE_SIZES}
                />
              </Box>
              <Box
                sx={{
                  display: { xs: 'none', md: 'flex' },
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
                  />
                  <Divider flexItem sx={{ borderColor: 'rgba(var(--mui-palette-dividerChannel) / 0.35)' }} />
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: 2.5,
                      border: 'none',
                      bgcolor: 'rgba(var(--mui-palette-background-defaultChannel) / 0.55)',
                      p: 2,
                    }}
                  >
                    <RealEstateSellerCardContents
                      sellerSectionHeadingId="re-seller-heading-hero"
                      listing={listing}
                      displayPhone={displayPhone}
                    />
                  </Paper>
                </Stack>
              </Box>
            </Stack>
            </Box>

            <Stack spacing={{ xs: 3, md: 3.5 }} sx={{ px: { xs: 2, sm: 3, md: 0 }, pb: { xs: 18, md: 6 }, width: '100%' }}>
            <Stack spacing={1.75}>
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
              </Typography>

              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <Typography
                    sx={{
                      fontWeight: 900,
                      fontSize: { xs: '1.85rem', sm: '2.15rem' },
                      color: 'primary.main',
                      lineHeight: 1.1,
                    }}
                  >
                    {formatPrice(listing.price, listing.currency)}
                    {listing.transactionType === 'rent' ? (
                      <Typography component="span" variant="subtitle2" sx={{ ml: 0.5, fontWeight: 600, color: 'text.secondary' }}>
                        / muaj
                      </Typography>
                    ) : null}
                  </Typography>
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
                </Stack>
              </Box>

              <Stack spacing={1.25}>
                <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: { xs: 1.25, sm: 2 } }}>
                  {locationFull ? (
                    <Stack direction="row" spacing={0.65} sx={{ alignItems: 'center', maxWidth: '100%' }}>
                      <Box sx={{ color: 'primary.main', opacity: 0.9, display: 'inline-flex', lineHeight: 0 }}>
                        <MapPinIcon size={17} weight="regular" color="currentColor" />
                      </Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, lineHeight: 1.4 }}>
                        {locationFull}
                      </Typography>
                    </Stack>
                  ) : null}
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                    <EyeIcon size={17} weight="regular" aria-hidden />
                    <Typography variant="body2">{new Intl.NumberFormat('sq-AL').format(viewCount)} shikime</Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.55} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                    <CalendarIcon size={17} weight="regular" aria-hidden />
                    <Typography variant="body2">{postedLabelSq(listing.updatedAt ?? listing.createdAt)}</Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Stack>

            <Paper
              variant="outlined"
              sx={{ borderRadius: 2.5, borderColor: 'divider', bgcolor: 'background.paper', px: { xs: 1, sm: 1.5 }, py: { xs: 1.75, sm: 2 } }}
            >
              <Stack direction="row" sx={{ flexWrap: 'wrap', justifyContent: 'space-evenly', rowGap: 1 }}>
                {listing.bedrooms != null ? (
                  <SpecIconBox Icon={BedIcon} primary={`${listing.bedrooms}`} secondary={listing.bedrooms === 1 ? 'Dhomë gjumi' : 'Dhoma gjumi'} />
                ) : null}
                {listing.bathrooms != null ? (
                  <SpecIconBox
                    Icon={BathtubIcon}
                    primary={`${listing.bathrooms}`}
                    secondary={listing.bathrooms === 1 ? 'Tualet' : 'Tualete'}
                  />
                ) : null}
                <SpecIconBox Icon={RulerIcon} primary={`${listing.surfaceM2} m²`} secondary="Sipërfaqe" />
                {listing.propertyCategory === 'parking' && listing.parkingFloor != null ? (
                  <SpecIconBox Icon={CarIcon} primary={`Kati ${listing.parkingFloor}`} secondary="Parkim" />
                ) : listing.totalFloors != null ? (
                  <SpecIconBox Icon={StairsIcon} primary={`${listing.totalFloors}`} secondary={listing.totalFloors === 1 ? 'Kat' : 'Kata'} />
                ) : listing.floor != null ? (
                  <SpecIconBox Icon={StairsIcon} primary={`Kat ${listing.floor}`} secondary="Niveli" />
                ) : null}
              </Stack>
            </Paper>

            <Stack spacing={2} component="section" aria-labelledby="re-desc-heading">
              {sectionTitle('Përshkrimi', 're-desc-heading')}
              <RealEstateListingExpandableText text={listing.description} />
            </Stack>

            <Stack spacing={0} component="section" aria-labelledby="re-detail-heading">
              {sectionTitle('Detajet', 're-detail-heading')}
              <Stack divider={<Divider flexItem />} spacing={0}>
                {detailRows.filter(Boolean).map((row) => (
                  <DetailRow key={row!.label} label={row!.label} value={row!.value} />
                ))}
              </Stack>
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

            <Divider sx={{ borderColor: 'divider' }} />

            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <Stack spacing={2} component="section" aria-labelledby="re-seller-heading-scroll">
                <Paper variant="outlined" sx={{ borderRadius: 2.5, borderColor: 'divider', bgcolor: 'background.paper', p: { xs: 2, sm: 2.5 } }}>
                  <RealEstateSellerCardContents
                    sellerSectionHeadingId="re-seller-heading-scroll"
                    listing={listing}
                    displayPhone={displayPhone}
                  />
                </Paper>
              </Stack>
            </Box>

            <Stack spacing={1.5} component="section" aria-labelledby="re-loc-heading">
              {sectionTitle('Vendndodhja', 're-loc-heading')}
              {locationFull ? (
                <>
                  <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.65, fontWeight: 500 }}>
                    {listing.zoneName && listing.cityName ? `${listing.zoneName}, ${listing.cityName}` : listing.cityName ?? listing.zoneName}
                    {listing.cityName || listing.zoneName ? ', Shqipëri.' : '.'}
                  </Typography>
                  {mapLink ? (
                    <Typography
                      component="a"
                      href={mapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="subtitle2"
                      sx={{ fontWeight: 850, color: 'primary.main' }}
                    >
                      Shiko në hartë
                    </Typography>
                  ) : null}
                </>
              ) : (
                <Typography sx={{ color: 'text.secondary' }}>Vendndodhja do të përditësohet së shpejti.</Typography>
              )}
            </Stack>

            {similar.length > 0 ? (
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

      <StickyContactBar phone={displayPhone} whatsappInquireHref={whatsappInquireHref} />
    </>
  );
}
