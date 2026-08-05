'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Calendar as CalendarIcon } from '@phosphor-icons/react/dist/ssr/Calendar';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Clock as ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { GasPump as GasPumpIcon } from '@phosphor-icons/react/dist/ssr/GasPump';
import { Gauge as GaugeIcon } from '@phosphor-icons/react/dist/ssr/Gauge';
import { GearSix as GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';
import { GraduationCap as GraduationCapIcon } from '@phosphor-icons/react/dist/ssr/GraduationCap';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Palette as PaletteIcon } from '@phosphor-icons/react/dist/ssr/Palette';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Tag as TagIcon } from '@phosphor-icons/react/dist/ssr/Tag';
import { User as UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { WhatsappLogo as WhatsappLogoIcon } from '@phosphor-icons/react/dist/ssr/WhatsappLogo';
import { Wrench as WrenchIcon } from '@phosphor-icons/react/dist/ssr/Wrench';
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
import type {
  AnyPublicListingDetail,
  PublicCarListing,
  PublicMarketplaceListing,
} from '@/lib/public-listings-client';

import { ListingMessageButton } from '@/components/public/listing-message-button';
import { ListingSellerProfileCard } from '@/components/public/listing-seller-profile-card';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { LocationMapEmbed } from '@/components/public/location-map-embed';
import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { RealEstateListingGallery } from '@/components/public/real-estate-listing-gallery';
import { StickyListingContact } from '@/components/public/sticky-listing-contact';
import { whatsappOutlinedButtonSx } from '@/components/public/whatsapp-outlined-button-sx';
import { productButtonSx, productPanelSx } from '@/styles/product-sx';
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
import { type OwnerEditHandlers } from '@/components/user/owner-edit-pencil';
import { OwnerEditableSpot } from '@/components/user/owner-inline-edit';
import { useListingBookmark } from '@/hooks/use-listing-bookmark';
import { metricKindToConversationKind } from '@/lib/conversations-client';
import type { ListingMetricKind } from '@/lib/listing-metrics';

type SpecIcon = typeof TagIcon;

type SummarySpec = {
  Icon: SpecIcon;
  label: string;
  value: string;
};

function interestCategoryFromListing(listing: AnyPublicListingDetail): string | null {
  const raw =
    'propertyCategory' in listing
      ? listing.propertyCategory
      : 'industry' in listing
        ? listing.industry
        : 'make' in listing
          ? listing.make
          : 'category' in listing
            ? listing.category
            : null;
  return typeof raw === 'string' && raw.trim() ? raw : null;
}

function conditionIcon(condition: string | null | undefined): SpecIcon {
  if (condition === 'i-ri' || condition === 'si-i-ri') return SparkleIcon;
  return CheckCircleIcon;
}

function SpecIconBox({ Icon, primary, secondary }: { Icon: SpecIcon; primary: string; secondary: string }) {
  return (
    <Stack
      spacing={0.65}
      sx={{
        alignItems: 'center',
        justifyContent: 'flex-start',
        flex: '1 1 0',
        minWidth: { xs: '30%', sm: 0 },
        px: { xs: 0.75, sm: 1.25 },
        py: 0.5,
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.12)',
          color: 'primary.main',
          lineHeight: 0,
          flexShrink: 0,
        }}
      >
        <Icon weight="regular" color="currentColor" size={18} aria-hidden />
      </Box>
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 800,
          color: 'text.primary',
          fontSize: { xs: '0.78rem', sm: '0.875rem' },
          textAlign: 'center',
          lineHeight: 1.25,
          maxWidth: '100%',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
        title={primary}
      >
        {primary}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          color: 'text.secondary',
          fontSize: '0.68rem',
          textAlign: 'center',
          lineHeight: 1.2,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
        }}
      >
        {secondary}
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
              sx={{ flex: 1, ...productButtonSx, py: 1.2 }}
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
                  ...productButtonSx,
                  ...whatsappOutlinedButtonSx,
                }}
                aria-label="WhatsApp"
              >
                <WhatsappLogoIcon weight="regular" size={26} />
              </Button>
            ) : null}
          </Stack>
        ) : (
          <Button variant="contained" disabled fullWidth sx={productButtonSx}>
            Nr. kontakti i padisponueshëm
          </Button>
        )}
        <ListingMessageButton
          listingKind={metricKindToConversationKind(listing.kind as ListingMetricKind)}
          listingId={listing.id}
          variant="outlined"
          fullWidth
          size="large"
          sx={{ ...productButtonSx, py: 1.2 }}
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
  /** Owner edit canvas — hide buyer chrome (contact, similar, metrics). */
  ownerPreview?: boolean;
  ownerEdit?: OwnerEditHandlers;
}) {
  const { listing, canonicalUrl, browseHref, similarSectionTitle, similar, ownerPreview = false, ownerEdit } = props;
  const onEditInfo = ownerEdit?.onEditInfo;
  const onEditPrice = ownerEdit?.onEditPrice ?? onEditInfo;
  const onEditSpecs = ownerEdit?.onEditSpecs ?? onEditInfo;
  const canInline = Boolean(ownerEdit?.onStartInlineEdit);

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

  const summarySpecs = summarySpecsFor(listing);

  return (
    <>
      {ownerPreview ? null : (
        <ListingMetricsTracker
          listingKind={metricKind}
          listingId={listing.id}
          city={'cityName' in listing ? listing.cityName : null}
          category={interestCategoryFromListing(listing)}
        />
      )}
      <Box component="article" sx={{ bgcolor: 'background.default', pb: ownerPreview ? 3 : { xs: 14, md: 6 } }}>
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
            <Stack
              direction={ownerPreview ? 'column' : { xs: 'column', md: 'row' }}
              sx={{ alignItems: { md: 'stretch' }, minHeight: 0 }}
            >
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
                  browseListHref={ownerPreview ? undefined : browseHref}
                  browseListAriaLabel="Prapa te lista"
                  heroSizes={LISTING_DETAIL_HERO_IMAGE_SIZES}
                  listingKind={metricKind}
                  listingId={listing.id}
                  shareCount={ownerPreview ? undefined : listing.shareCount}
                  saveCount={ownerPreview ? undefined : saveCount}
                  bookmark={ownerPreview ? undefined : { saved, onToggle: () => void toggleSave() }}
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
                  <SellerProfileInner
                    listing={listing}
                    cardSx={{ border: 'none', p: 2 }}
                  />
                </Stack>
              </Box>
            </Stack>
          </Box>
        </Container>

        <Container maxWidth="lg" sx={{ pt: { xs: 2.5, sm: 3 }, pb: 2 }}>
          <Stack spacing={{ xs: 3, md: 3 }} sx={{ width: '100%' }}>
            <Stack spacing={1.25}>
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
                    color: 'text.primary',
                    letterSpacing: '-0.02em',
                    fontSize: { xs: '1.5rem', sm: '1.85rem', md: '2rem' },
                  }}
                >
                  {listingTitle(listing)}
                </Typography>
              </OwnerEditableSpot>

              <Box sx={{ display: ownerPreview ? 'block' : { xs: 'block', md: 'none' } }}>
                <OwnerEditableSpot
                  field="price"
                  ownerEdit={ownerEdit}
                  label="Ndrysho çmimin"
                  legacyOnClick={onEditPrice}
                >
                  {primaryPriceRow(listing)}
                </OwnerEditableSpot>
              </Box>

              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: { xs: 1.25, sm: 2 }, color: 'text.secondary', alignItems: 'center' }}>
                {canInline || onEditInfo ? (
                  <OwnerEditableSpot
                    field="location"
                    ownerEdit={ownerEdit}
                    label="Ndrysho lokacionin"
                    legacyOnClick={onEditInfo}
                  >
                    <Box sx={{ color: 'primary.main', opacity: 0.9, display: 'inline-flex', lineHeight: 0 }}>
                      <MapPinIcon size={17} weight="regular" color="currentColor" />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      {'cityName' in listing && listing.cityName
                        ? listing.cityName
                        : 'Shtoni lokacionin'}
                    </Typography>
                  </OwnerEditableSpot>
                ) : (
                  subtitleLine(listing)
                )}
                <Typography variant="body2">{new Intl.NumberFormat('sq-AL').format(viewCount)} shikime</Typography>
                {listing.kind === 'job' && !listing.isOkazion ? (
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

            <Stack spacing={1.5} component="section" aria-labelledby="vertical-summary-heading">
              <OwnerEditableSpot
                field="specs"
                ownerEdit={ownerEdit}
                label="Ndrysho specifikimet"
                legacyOnClick={onEditSpecs}
              >
                <Typography
                  id="vertical-summary-heading"
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
                    summarySpecs.length <= 4 ? (
                      <Divider
                        orientation="vertical"
                        flexItem
                        sx={{ borderColor: 'rgba(var(--mui-palette-dividerChannel) / 0.55)', my: 0.5 }}
                      />
                    ) : undefined
                  }
                  sx={{
                    alignItems: 'stretch',
                    width: '100%',
                    flexWrap: summarySpecs.length > 4 ? 'wrap' : 'nowrap',
                    rowGap: 1.5,
                    justifyContent: summarySpecs.length > 4 ? 'space-evenly' : 'flex-start',
                  }}
                >
                  {summarySpecs.map((spec) => (
                    <SpecIconBox
                      key={`${spec.label}-${spec.value}`}
                      Icon={spec.Icon}
                      primary={spec.value}
                      secondary={spec.label}
                    />
                  ))}
                </Stack>
              </Box>
              )}
            </Stack>

            {extrasBlock(listing)}

            <Stack spacing={1.5}>
              <OwnerEditableSpot
                field="description"
                ownerEdit={ownerEdit}
                label="Ndrysho përshkrimin"
                legacyOnClick={onEditSpecs}
              >
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: '0.1em' }}>
                  Përshkrimi
                </Typography>
              </OwnerEditableSpot>
              {ownerEdit?.editingField === 'description' && ownerEdit.inlineEditors?.description ? null : listing.description ? (
                <RealEstateListingExpandableText text={listing.description} />
              ) : canInline || onEditSpecs ? (
                <Typography sx={{ color: 'text.secondary' }}>Shtoni përshkrimin</Typography>
              ) : null}
            </Stack>

            {mapQuery ? (
              <Stack spacing={1.5}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: '0.1em' }}>
                  Vendndodhja
                </Typography>
                <LocationMapEmbed query={mapQuery} />
              </Stack>
            ) : null}

            <Box sx={{ display: ownerPreview ? 'block' : { xs: 'block', md: 'none' } }}>{sellerBlock(listing)}</Box>

            {!ownerPreview && similar.length ? (
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

      {ownerPreview ? null : (
        <StickyListingContact
          listingKind={metricKindToConversationKind(metricKind)}
          listingId={listing.id}
        />
      )}
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
  if (l.kind === 'professionals') return null;
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

function summarySpecsFor(l: AnyPublicListingDetail): SummarySpec[] {
  switch (l.kind) {
    case 'car':
      return [
        { Icon: CarIcon, label: 'Markë', value: l.make },
        { Icon: TagIcon, label: 'Model', value: l.model },
        ...(l.variant ? [{ Icon: TagIcon, label: 'Variant', value: l.variant }] : []),
        { Icon: CalendarIcon, label: 'Viti', value: String(l.year) },
        { Icon: GaugeIcon, label: 'Kilometrazhi', value: formatKilometers(l.kilometers) },
        { Icon: GearSixIcon, label: 'Transmision', value: findOptionLabel(TRANSMISSION_OPTIONS, l.transmission) },
        { Icon: GasPumpIcon, label: 'Karburant', value: findOptionLabel(FUEL_TYPE_OPTIONS, l.fuelType) },
        { Icon: PaletteIcon, label: 'Ngjyra', value: findOptionLabel(CAR_COLOUR_OPTIONS, l.color) },
        ...(l.cityName ? [{ Icon: MapPinIcon, label: 'Qyteti', value: l.cityName }] : []),
      ];
    case 'job':
      return [
        { Icon: BriefcaseIcon, label: 'Industria', value: findOptionLabel(JOB_INDUSTRY_OPTIONS, l.industry) },
        { Icon: ClockIcon, label: 'Lloji i punës', value: findOptionLabel(JOB_TYPE_OPTIONS, l.jobType) },
        { Icon: MapPinIcon, label: 'Vendi', value: findOptionLabel(WORK_LOCATION_OPTIONS, l.workLocation) },
        { Icon: UserIcon, label: 'Eksperienca', value: findOptionLabel(JOB_EXPERIENCE_OPTIONS, l.experience) },
        { Icon: GraduationCapIcon, label: 'Arsimi', value: findOptionLabel(JOB_EDUCATION_OPTIONS, l.education) },
        ...(l.cityName ? [{ Icon: MapPinIcon, label: 'Qyteti', value: l.cityName }] : []),
      ];
    case 'marketplace':
      return [
        { Icon: TagIcon, label: 'Kategoria', value: findOptionLabel(MARKETPLACE_CATEGORY_OPTIONS, l.category) },
        ...(l.condition
          ? [
              {
                Icon: conditionIcon(l.condition),
                label: 'Gjendja',
                value: findOptionLabel(MARKETPLACE_CONDITION_OPTIONS, l.condition),
              },
            ]
          : []),
        ...(l.cityName ? [{ Icon: MapPinIcon, label: 'Qyteti', value: l.cityName }] : []),
      ];
    default:
      if (l.kind === 'businesses') {
        return [
          { Icon: BuildingsIcon, label: 'Lloji', value: l.categoryLabel },
          ...(l.openingHours ? [{ Icon: ClockIcon, label: 'Orari', value: l.openingHours }] : []),
          ...(l.servicesHighlight ? [{ Icon: SparkleIcon, label: 'Veçori', value: l.servicesHighlight }] : []),
          ...(l.cityName ? [{ Icon: MapPinIcon, label: 'Qyteti', value: l.cityName }] : []),
        ];
      }
      /* professionals */
      return [
        { Icon: WrenchIcon, label: 'Shërbimi', value: l.categoryLabel },
        ...(l.condition
          ? [
              {
                Icon: conditionIcon(l.condition),
                label: 'Gjendja',
                value: findOptionLabel(MARKETPLACE_CONDITION_OPTIONS, l.condition),
              },
            ]
          : []),
        ...(l.cityName ? [{ Icon: MapPinIcon, label: 'Qyteti', value: l.cityName }] : []),
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
function SellerProfileInner({
  listing: l,
  cardSx,
}: {
  listing: AnyPublicListingDetail;
  cardSx?: React.ComponentProps<typeof ListingSellerProfileCard>['cardSx'];
}) {
  return <ListingSellerProfileCard seller={l.seller} cardSx={cardSx} />;
}

function sellerBlock(l: AnyPublicListingDetail): React.ReactNode {
  return <SellerProfileInner listing={l} />;
}
