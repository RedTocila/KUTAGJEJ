'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { WhatsappLogo as WhatsappLogoIcon } from '@phosphor-icons/react/dist/ssr/WhatsappLogo';
import {
  CAR_COLOUR_OPTIONS,
  FUEL_TYPE_OPTIONS,
  TRANSMISSION_OPTIONS,
} from '@/lib/car-constants';
import {
  JOB_EDUCATION_OPTIONS,
  JOB_EXPERIENCE_OPTIONS,
  JOB_INDUSTRY_OPTIONS,
  JOB_TYPE_OPTIONS,
  WORK_LOCATION_OPTIONS,
} from '@/lib/job-constants';
import { MARKETPLACE_CATEGORY_OPTIONS, MARKETPLACE_CONDITION_OPTIONS } from '@/lib/marketplace-constants';
import { whatsappHref } from '@/lib/listing-contact';
import { listingDetailGalleryPlaceholder } from '@/lib/listing-gallery-placeholder';
import {
  LISTING_DETAIL_HERO_GALLERY_MAX_WIDTH_PX,
  LISTING_DETAIL_HERO_IMAGE_SIZES,
} from '@/lib/listing-detail-layout';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import type {
  AnyPublicListingDetail,
  PublicCarListing,
  PublicMarketplaceListing,
} from '@/lib/public-listings-client';

import { ListingMessageButton } from '@/components/public/listing-message-button';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { LocationMapEmbed } from '@/components/public/location-map-embed';
import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { RealEstateListingGallery } from '@/components/public/real-estate-listing-gallery';
import { StickyListingContact } from '@/components/public/sticky-listing-contact';
import { whatsappOutlinedButtonSx } from '@/components/public/whatsapp-outlined-button-sx';
import { CarCard } from '@/components/public/listing-cards/car-card';
import {
  findOptionLabel,
  formatKilometers,
  formatPrice,
  relativeAlbanianDate,
} from '@/components/public/listing-cards/format-helpers';
import { JobListingCountdown } from '@/components/public/listing-cards/job-listing-countdown';
import { MarketplaceCard } from '@/components/public/listing-cards/marketplace-card';
import { getJobListingExpiresAt } from '@/lib/job-listing-expiry';
import { ListingMetricsTracker } from '@/components/public/listing-metrics-tracker';
import { useListingBookmark } from '@/hooks/use-listing-bookmark';
import { metricKindToConversationKind } from '@/lib/conversations-client';
import type { ListingMetricKind } from '@/lib/listing-metrics';
import { pathsPublicMemberProfile } from '@/paths';

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2, py: 0.85 }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600, textAlign: 'right', maxWidth: '62%' }}>
        {value}
      </Typography>
    </Stack>
  );
}

function asideLocationFullLine(l: AnyPublicListingDetail): string | null {
  const city =
    'cityName' in l && l.cityName?.trim()
      ? l.cityName.trim()
      : null;
  return city ? `${city}, Shqipëri` : null;
}

function ListingContactAside(props: {
  listing: AnyPublicListingDetail;
  displayPhone: string;
  whatsappInquireHref?: string | null | undefined;
}) {
  const { listing, displayPhone, whatsappInquireHref } = props;
  const asideLoc = asideLocationFullLine(listing);
  return (
    <Stack spacing={2}>
      <Stack spacing={0.75}>
        <Box sx={{ width: '100%' }}>{sidebarPrice(listing)}</Box>
        {asideLoc ? (
          <Stack direction="row" spacing={0.65} sx={{ alignItems: 'flex-start', maxWidth: '100%' }}>
            <Box sx={{ color: 'primary.main', opacity: 0.9, display: 'inline-flex', flexShrink: 0, lineHeight: 0, pt: 0.35 }}>
              <MapPinIcon size={17} weight="regular" color="currentColor" aria-hidden />
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, lineHeight: 1.45 }}>
              {asideLoc}
            </Typography>
          </Stack>
        ) : null}
      </Stack>
      <Divider />
      <Stack spacing={1.25}>
        {displayPhone ? (
          <Stack direction="row" spacing={1.25}>
            <Button
              component="a"
              href={`tel:${displayPhone.replace(/\s/g, '')}`}
              variant="contained"
              disableElevation
              size="large"
              sx={{ flex: 1, borderRadius: 2, fontWeight: 800, textTransform: 'none', py: 1.2 }}
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
                size="large"
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
        ) : (
          <Button variant="contained" disabled fullWidth sx={{ borderRadius: 2 }}>
            Nr. kontakti i padisponueshëm
          </Button>
        )}
        <ListingMessageButton
          listingKind={metricKindToConversationKind(listing.kind as ListingMetricKind)}
          listingId={listing.id}
          variant="outlined"
          fullWidth
          size="large"
          sx={{ borderRadius: 2, fontWeight: 800, textTransform: 'none', py: 1.2 }}
        />
      </Stack>
    </Stack>
  );
}

export function VerticalListingDetailView(props: {
  listing: AnyPublicListingDetail;
  canonicalUrl: string;
  browseHref: string;
  similarSectionTitle: string;
  similar: PublicCarListing[] | PublicMarketplaceListing[];
}) {
  const { listing, canonicalUrl, browseHref, similarSectionTitle, similar } = props;

  const displayPhone =
    listing.contactPhone?.trim() || listing.seller?.phone?.trim() || '';
  const wa = whatsappHref(displayPhone);
  const whatsappInquireHref = wa
    ? `${wa}?text=${encodeURIComponent(`Përshëndetje, jam i interesuari për: «${listingTitle(listing)}» (${canonicalUrl}).`)}`
    : undefined;

  const viewCount = listing.viewCount ?? 0;
  const metricKind = listing.kind as ListingMetricKind;
  const { saved, saveCount, toggleSave } = useListingBookmark(metricKind, listing.id, {
    saved: 'saved' in listing ? listing.saved : undefined,
    saveCount: listing.saveCount,
  });

  let mapQuery: string | null = null;
  if ('cityName' in listing && listing.cityName) {
    mapQuery = `${listing.cityName}, Shqipëri`;
  }

  return (
    <>
      <ListingMetricsTracker listingKind={metricKind} listingId={listing.id} />
      <Box component="article" sx={{ bgcolor: 'background.default', pb: { xs: 14, md: 6 } }}>
        <Container maxWidth={false} sx={{ px: { xs: 0, md: 3 }, bgcolor: 'background.default' }}>
          <Box
            sx={{
              mx: 'auto',
              maxWidth: { md: 1320 },
              borderRadius: { xs: 0, md: 3 },
              overflow: 'hidden',
              bgcolor: 'background.paper',
              boxShadow: { xs: 'none', md: '0 12px 40px rgba(0, 0, 0, 0.08)' },
            }}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} sx={{ alignItems: { md: 'stretch' }, minHeight: 0 }}>
              <Box
                sx={{
                  flex: { md: `0 1 ${LISTING_DETAIL_HERO_GALLERY_MAX_WIDTH_PX}px` },
                  maxWidth: { md: LISTING_DETAIL_HERO_GALLERY_MAX_WIDTH_PX },
                  minWidth: 0,
                  width: { xs: '100%', md: 'auto' },
                }}
              >
                <RealEstateListingGallery
                  title={listingTitle(listing)}
                  imageUrls={listing.imageUrls}
                  placeholderIcon={listingDetailGalleryPlaceholder(listing)}
                  browseListHref={browseHref}
                  browseListAriaLabel="Prapa te lista"
                  heroSizes={LISTING_DETAIL_HERO_IMAGE_SIZES}
                  listingKind={metricKind}
                  listingId={listing.id}
                  shareCount={listing.shareCount}
                  saveCount={saveCount}
                  bookmark={{ saved, onToggle: () => void toggleSave() }}
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
                  borderLeft: 1,
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  p: 2.5,
                  justifyContent: 'flex-start',
                  alignSelf: { md: 'stretch' },
                }}
              >
                <Stack spacing={2} sx={{ width: '100%' }}>
                  <ListingContactAside
                    listing={listing}
                    displayPhone={displayPhone}
                    whatsappInquireHref={whatsappInquireHref}
                  />
                  <Divider flexItem />
                  <Paper variant="outlined" sx={{ borderRadius: 2.5, borderColor: 'divider', bgcolor: 'background.paper', p: 2 }}>
                    <SellerProfileInner listing={listing} />
                  </Paper>
                </Stack>
              </Box>
            </Stack>
          </Box>
        </Container>

        <Container maxWidth="lg" sx={{ pt: { xs: 2.5, sm: 3 }, pb: 2 }}>
          <Stack spacing={{ xs: 3, md: 3 }} sx={{ width: '100%' }}>
            <Stack spacing={1.25}>
              <Typography
                variant="h3"
                component="h1"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.18,
                  color: 'text.primary',
                  letterSpacing: '-0.02em',
                  fontSize: { xs: '1.5rem', sm: '1.85rem', md: '2rem' },
                }}
              >
                {listingTitle(listing)}
              </Typography>

              <Box sx={{ display: { xs: 'block', md: 'none' } }}>{primaryPriceRow(listing)}</Box>

              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: { xs: 1.25, sm: 2 }, color: 'text.secondary' }}>
                {subtitleLine(listing)}
                <Typography variant="body2">{new Intl.NumberFormat('sq-AL').format(viewCount)} shikime</Typography>
                {listing.kind === 'job' ? (
                  <JobListingCountdown
                    expiresAt={
                      listing.expiresAt ?? getJobListingExpiresAt(listing.createdAt).toISOString()
                    }
                    chipSx={{ height: 28, fontSize: '0.8rem' }}
                  />
                ) : (
                  <Typography variant="body2">{relativeAlbanianDate(listing.updatedAt ?? listing.createdAt)}</Typography>
                )}
              </Stack>
            </Stack>

            <Paper variant="outlined" sx={{ borderRadius: 2.5, borderColor: 'divider', bgcolor: 'background.paper', p: 2 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: '0.1em', display: 'block', mb: 1.5 }}>
                Përmbledhje
              </Typography>
              <Stack divider={<Divider flexItem />} spacing={0}>
                {detailRowsFor(listing).map((row) => (
                  <DetailLine key={`${row.label}-${row.value}`} label={row.label} value={row.value} />
                ))}
              </Stack>
            </Paper>

            {extrasBlock(listing)}

            <Stack spacing={1.5}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: '0.1em' }}>
                Përshkrimi
              </Typography>
              <RealEstateListingExpandableText text={listing.description} />
            </Stack>

            {mapQuery ? (
              <Stack spacing={1.5}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: '0.1em' }}>
                  Vendndodhja
                </Typography>
                <LocationMapEmbed query={mapQuery} linkLabel="Shiko zonën në hartë" />
              </Stack>
            ) : null}

            <Box sx={{ display: { xs: 'block', md: 'none' } }}>{sellerBlock(listing)}</Box>

            {similar.length ? (
              <Stack spacing={1.5} component="aside" aria-labelledby="vertical-similar-heading">
                <Divider />
                <Typography
                  id="vertical-similar-heading"
                  variant="overline"
                  sx={{ fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary' }}
                >
                  {similarSectionTitle}
                </Typography>
                <Box
                  sx={{
                    mx: { xs: -2, sm: -3, md: 0 },
                    '& > div > div': { py: '8px 0 0 !important' },
                  }}
                >
                  <ListingsCarousel>
                    {similar.map((s) =>
                      s.kind === 'car' ? (
                        <CarCard key={s.id} listing={s} />
                      ) : (
                        <MarketplaceCard key={s.id} listing={s} />
                      ),
                    )}
                  </ListingsCarousel>
                </Box>
              </Stack>
            ) : null}
          </Stack>
        </Container>
      </Box>

      <StickyListingContact
        listingKind={metricKindToConversationKind(metricKind)}
        listingId={listing.id}
      />
    </>
  );
}

function listingTitle(l: AnyPublicListingDetail): string {
  if (l.kind === 'car') return l.title;
  if (l.kind === 'job') return l.title;
  if (l.kind === 'marketplace') return l.title;
  if (l.kind === 'businesses' || l.kind === 'professionals') return l.title;
  return '';
}

function subtitleLine(l: AnyPublicListingDetail): React.ReactNode {
  const city =
    'cityName' in l ? l.cityName : null;
  if (!city) return null;
  return (
    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', width: '100%' }}>
      {city}
    </Typography>
  );
}

function primaryPriceRow(l: AnyPublicListingDetail): React.ReactNode {
  if (l.kind === 'job') {
    const line =
      l.salary != null ? `${formatPrice(l.salary, l.currency)} / muaj` : 'Pagë e diskutueshme';
    return (
      <Typography sx={{ fontWeight: 950, fontSize: '1.75rem', color: 'primary.main', lineHeight: 1.1 }}>
        {line}
      </Typography>
    );
  }
  if (l.kind === 'marketplace') {
    return (
      <Typography sx={{ fontWeight: 950, fontSize: '1.75rem', color: 'primary.main', lineHeight: 1.1 }}>
        {formatPrice(l.price, l.currency)}
      </Typography>
    );
  }
  if (l.kind === 'businesses') return null;
  if (l.kind === 'professionals') {
    const line = l.price != null ? formatPrice(l.price, l.currency) : 'Tarifë — kontakt';
    return (
      <Typography
        sx={{
          fontWeight: 950,
          fontSize: l.price != null ? '1.75rem' : '1.1rem',
          color: l.price != null ? 'primary.main' : 'text.secondary',
          lineHeight: 1.1,
        }}
      >
        {line}
      </Typography>
    );
  }
  if (l.kind === 'car') {
    return (
      <Typography sx={{ fontWeight: 950, fontSize: '1.85rem', color: 'primary.main', lineHeight: 1.1 }}>
        {formatPrice(l.price, l.currency)}
      </Typography>
    );
  }
  return null;
}

function sidebarPrice(l: AnyPublicListingDetail): React.ReactNode {
  return primaryPriceRow(l);
}

function detailRowsFor(l: AnyPublicListingDetail): Array<{ label: string; value: string }> {
  switch (l.kind) {
    case 'car':
      return [
        { label: 'Markë', value: l.make },
        { label: 'Model', value: l.model },
        ...(l.variant ? [{ label: 'Variant', value: l.variant }] : []),
        { label: 'Viti', value: String(l.year) },
        { label: 'Kilometrazhi', value: formatKilometers(l.kilometers) },
        { label: 'Transmision', value: findOptionLabel(TRANSMISSION_OPTIONS, l.transmission) },
        { label: 'Karburant', value: findOptionLabel(FUEL_TYPE_OPTIONS, l.fuelType) },
        { label: 'Ngjyra', value: findOptionLabel(CAR_COLOUR_OPTIONS, l.color) },
        ...(l.cityName ? [{ label: 'Qyteti', value: l.cityName }] : []),
      ];
    case 'job':
      return [
        { label: 'Industria', value: findOptionLabel(JOB_INDUSTRY_OPTIONS, l.industry) },
        { label: 'Lloji i punës', value: findOptionLabel(JOB_TYPE_OPTIONS, l.jobType) },
        { label: 'Vendi', value: findOptionLabel(WORK_LOCATION_OPTIONS, l.workLocation) },
        { label: 'Eksperienca', value: findOptionLabel(JOB_EXPERIENCE_OPTIONS, l.experience) },
        { label: 'Arsimi', value: findOptionLabel(JOB_EDUCATION_OPTIONS, l.education) },
        ...(l.cityName ? [{ label: 'Qyteti', value: l.cityName }] : []),
      ];
    case 'marketplace':
      return [
        { label: 'Kategoria', value: findOptionLabel(MARKETPLACE_CATEGORY_OPTIONS, l.category) },
        ...(l.condition ? [{ label: 'Gjendja', value: findOptionLabel(MARKETPLACE_CONDITION_OPTIONS, l.condition) }] : []),
        ...(l.cityName ? [{ label: 'Qyteti', value: l.cityName }] : []),
      ];
    default:
      if (l.kind === 'businesses') {
        const rows: Array<{ label: string; value: string }> = [
          { label: 'Lloji', value: l.categoryLabel },
          ...(l.openingHours ? [{ label: 'Orari', value: l.openingHours }] : []),
          ...(l.servicesHighlight ? [{ label: 'Veçori', value: l.servicesHighlight }] : []),
          ...(l.cityName ? [{ label: 'Qyteti', value: l.cityName }] : []),
        ];
        return rows;
      }
      /* professionals */
      return [
        { label: 'Shërbimi', value: l.categoryLabel },
        ...(l.condition ? [{ label: 'Gjendja', value: findOptionLabel(MARKETPLACE_CONDITION_OPTIONS, l.condition) }] : []),
        ...(l.cityName ? [{ label: 'Qyteti', value: l.cityName }] : []),
      ];
  }
}

function extrasBlock(l: AnyPublicListingDetail): React.ReactNode {
  if (l.kind !== 'car') return null;
  if (!l.extras?.length && !l.finish?.length) return null;
  return (
    <Stack spacing={1}>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: '0.1em' }}>
        Ekstra
      </Typography>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        {l.finish?.map((f) => (
          <Chip key={f} size="small" label={String(f)} sx={{ bgcolor: 'action.hover' }} />
        ))}
        {l.extras.map((e) => (
          <Chip key={e} size="small" label={String(e)} variant="outlined" />
        ))}
      </Stack>
    </Stack>
  );
}

/** Avatar + “Rreth shitësit” + Shiko profilin (nested card in desktop hero column, or wrapped below). */
function SellerProfileInner({ listing: l }: { listing: AnyPublicListingDetail }) {
  const s = l.seller;
  const initials =
    !s?.displayName
      ? '?'
      : s.displayName
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0]?.toUpperCase())
          .join('') || '?';
  const memberYear = s?.memberSince ? new Date(s.memberSince).getFullYear() : undefined;
  const profileHref = s?.id ? pathsPublicMemberProfile(s.id) : null;

  return (
    <>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: '0.1em', mb: 1.5, display: 'block' }}>
        Rreth shitësit / ofertuesit
      </Typography>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Avatar
          sx={{
            width: 64,
            height: 64,
            bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.16 : 0.12),
            color: 'primary.main',
            fontWeight: 800,
          }}
        >
          {initials}
        </Avatar>
        <Stack spacing={0.5} sx={{ flex: '1 1 auto', minWidth: 0 }}>
          <Typography sx={{ fontWeight: 850, fontSize: '1.125rem', color: 'text.primary' }}>
            {s?.displayName ?? 'Përdorues KuTaGjej'}
          </Typography>
          {memberYear != null ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Anëtar që prej {memberYear}
            </Typography>
          ) : null}
        </Stack>
      </Stack>
      <Button
        component={profileHref ? Link : 'button'}
        href={profileHref ?? undefined}
        disabled={!profileHref}
        variant="contained"
        disableElevation
        fullWidth
        sx={{
          mt: 2,
          borderRadius: 999,
          fontWeight: 800,
          textTransform: 'none',
          py: 1.25,
          color: 'common.black',
          boxShadow: 'none',
          '&:hover': { color: 'common.black' },
          '& .MuiButton-startIcon': { color: 'inherit' },
        }}
      >
        Shiko profilin
      </Button>
    </>
  );
}

function sellerBlock(l: AnyPublicListingDetail): React.ReactNode {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2.5, borderColor: 'divider', bgcolor: 'background.paper', p: { xs: 2, sm: 2.5 } }}>
      <SellerProfileInner listing={l} />
    </Paper>
  );
}
