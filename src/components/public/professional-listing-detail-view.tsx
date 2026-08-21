'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Box, ButtonBase, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Hammer as HammerIcon } from '@phosphor-icons/react/dist/ssr/Hammer';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { PaintBrush as PaintBrushIcon } from '@phosphor-icons/react/dist/ssr/PaintBrush';
import { Ruler as RulerIcon } from '@phosphor-icons/react/dist/ssr/Ruler';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';

import { paths } from '@/paths';
import { businessLocationLine, businessMapLocation, scrollToBusinessLocationMap } from '@/lib/google-maps-location';
import { LISTING_DETAIL_MOBILE_HEADING_FONT_SIZE } from '@/lib/listing-detail-layout';
import { listingDetailGalleryPlaceholder } from '@/lib/listing-gallery-placeholder';
import { MOBILE_BOTTOM_NAV_OFFSET } from '@/lib/mobile-layout';
import {
  professionalAvatarUrl,
  professionalCoverImageUrls,
  professionalDisplayName,
  professionalInitials,
  professionalPortfolioItems,
  professionalRatingDisplay,
  professionalServiceTags,
  professionalSubtitle,
} from '@/lib/professional-listing-detail-content';
import type { PublicDirectoryListing, PublicDirectoryListingDetail } from '@/lib/public-listings-client';
import { useListingBookmark } from '@/hooks/use-listing-bookmark';
import {
  ProfessionalReviewSection,
  type ProfessionalReviewSectionHandle,
  type ProfessionalReviewStats,
} from '@/components/professionals/professional-review-section';
import { BusinessPromoBanner } from '@/components/public/listing-cards/business-promo-banner';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { ListingMetricsTracker } from '@/components/public/listing-metrics-tracker';
import { ListingTrustBadge } from '@/components/public/listing-trust-badge';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { LocationMapEmbed } from '@/components/public/location-map-embed';
import { HistoryBackButton, ProductTag } from '@/components/public/product-browse-chrome';
import { ProfessionalListingDetailDesktop } from '@/components/public/professional-listing-detail-desktop';
import {
  ProfessionalPortfolioSection,
  ProfessionalRatingSummary,
  ProfessionalVerifiedBadge,
} from '@/components/public/professional-listing-detail-ui';
import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { RealEstateListingGallery } from '@/components/public/real-estate-listing-gallery';
import { StickyListingContact } from '@/components/public/sticky-listing-contact';
import { OwnerEditPencil, type OwnerEditHandlers } from '@/components/user/owner-edit-pencil';
import { OwnerEditableSpot } from '@/components/user/owner-inline-edit';
import { productPanelSx } from '@/styles/product-sx';

const FONT_BODY = '0.875rem';
const FONT_CAPTION = '0.75rem';
const CONTENT_MAX = 480;

const surfaceSx = {
  ...productPanelSx,
  p: 2,
} as const;

const SERVICE_TAG_ICONS = [HammerIcon, PaintBrushIcon, RulerIcon, SparkleIcon, BriefcaseIcon] as const;

export function ProfessionalListingDetailView({
  listing,
  canonicalUrl,
  similar = [],
  similarSlot,
  similarSlotDesktop,
  ownerPreview = false,
  ownerEdit,
}: {
  listing: PublicDirectoryListingDetail;
  canonicalUrl: string;
  similar?: PublicDirectoryListing[];
  similarSlot?: React.ReactNode;
  similarSlotDesktop?: React.ReactNode;
  /** Owner edit canvas — hide buyer chrome (contact, similar, metrics). */
  ownerPreview?: boolean;
  ownerEdit?: OwnerEditHandlers;
}) {
  const { saved, saveCount, toggleSave } = useListingBookmark('professionals', listing.id, {
    saved: listing.saved,
    saveCount: listing.saveCount,
  });

  const displayName = React.useMemo(() => professionalDisplayName(listing), [listing]);
  const subtitle = React.useMemo(() => professionalSubtitle(listing), [listing]);
  const [liveReviewStats, setLiveReviewStats] = React.useState<ProfessionalReviewStats | null>(null);
  const [leaveReviewAvailable, setLeaveReviewAvailable] = React.useState(false);
  const reviewSectionRef = React.useRef<ProfessionalReviewSectionHandle>(null);
  const rating = React.useMemo(
    () =>
      professionalRatingDisplay(
        liveReviewStats
          ? { ...listing, ratingAverage: liveReviewStats.ratingAverage, reviewCount: liveReviewStats.reviewCount }
          : listing
      ),
    [listing, liveReviewStats]
  );
  const onReviewStatsChange = React.useCallback((stats: ProfessionalReviewStats) => {
    setLiveReviewStats(stats);
  }, []);
  const serviceTags = React.useMemo(() => professionalServiceTags(listing), [listing]);
  const portfolio = React.useMemo(() => professionalPortfolioItems(listing), [listing]);
  const coverImageUrls = React.useMemo(() => professionalCoverImageUrls(listing), [listing]);
  const avatarUrl = React.useMemo(() => professionalAvatarUrl(listing), [listing]);
  const router = useRouter();
  const initials = React.useMemo(() => professionalInitials(listing), [listing]);

  const stickyFooterHeight = '80px';
  const scrollPadBottom = {
    xs: `calc(${stickyFooterHeight} + ${MOBILE_BOTTOM_NAV_OFFSET})`,
    md: 0,
  };

  const locationLine = React.useMemo(
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
  const isVerified = Boolean(listing.seller?.verified);

  return (
    <>
      {ownerPreview ? null : (
        <ListingMetricsTracker
          listingKind="professionals"
          listingId={listing.id}
          city={listing.cityName}
          category={listing.category}
          ownerId={listing.seller?.id}
          photoCount={1 + portfolio.length}
        />
      )}
      <ProfessionalListingDetailDesktop
        listing={listing}
        similar={ownerPreview || similarSlotDesktop ? [] : similar}
        similarSlot={ownerPreview ? undefined : similarSlotDesktop}
        saved={saved}
        saveCount={saveCount}
        onToggleSave={() => void toggleSave()}
        canonicalUrl={canonicalUrl}
        ownerPreview={ownerPreview}
      />

      <Box
        sx={{
          display: ownerPreview ? 'block' : { xs: 'block', md: 'none' },
          bgcolor: 'background.default',
          minHeight: ownerPreview ? 'auto' : '100vh',
          pb: ownerPreview ? 3 : scrollPadBottom,
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <RealEstateListingGallery
            title={displayName}
            imageUrls={coverImageUrls}
            placeholderIcon={listingDetailGalleryPlaceholder(listing)}
            browseListHref={ownerPreview ? undefined : paths.public.professionals}
            browseListAriaLabel="Prapa te lista e profesionistëve"
            listingKind="professionals"
            listingId={listing.id}
            shareCount={ownerPreview ? undefined : listing.shareCount}
            saveCount={ownerPreview ? undefined : saveCount}
            bookmark={ownerPreview ? undefined : { saved, onToggle: () => void toggleSave() }}
            sharePayload={
              ownerPreview
                ? undefined
                : {
                    title: displayName,
                    category: listing.categoryLabel,
                    imageUrl: coverImageUrls[0] ?? listing.imageUrl,
                    location: locationLine || listing.cityName || undefined,
                    contactPhone: (listing.contactPhone ?? listing.seller?.phone)?.trim() || undefined,
                    themeColor: listing.seller?.shareThemeColor || undefined,
                    createdAt: listing.createdAt,
                    viewCount: listing.viewCount,
                    saveCount,
                    ratingAverage: liveReviewStats?.ratingAverage ?? listing.ratingAverage,
                    reviewCount: liveReviewStats?.reviewCount ?? listing.reviewCount,
                    url: canonicalUrl,
                  }
            }
            hideSlideCount
            mediaActionSurface="glass"
            onEditPhotos={ownerEdit?.onEditPhotos ? () => ownerEdit.onEditPhotos!('cover') : undefined}
            heroOverlay={
              <Box
                sx={{
                  px: 1,
                  py: 0.4,
                  borderRadius: 999,
                  bgcolor: alpha('#000', 0.4),
                  backdropFilter: 'blur(10px)',
                  border: '1px solid',
                  borderColor: alpha('#fff', 0.16),
                }}
              >
                <ProfessionalRatingSummary
                  rating={rating.rating}
                  reviewCount={rating.reviews}
                  starSize={14}
                  onMedia
                  onLeaveReview={
                    ownerPreview || !leaveReviewAvailable
                      ? undefined
                      : () => reviewSectionRef.current?.openLeaveReview()
                  }
                />
              </Box>
            }
          />
        </Box>

        <Box sx={{ px: 2, maxWidth: CONTENT_MAX, mx: 'auto', width: '100%', boxSizing: 'border-box' }}>
          <Stack spacing={2.5} sx={{ pt: 0, pb: 3 }}>
            <Stack spacing={0.75} sx={{ mt: -1.5, alignItems: 'flex-start', width: '100%' }}>
              <Box sx={{ position: 'relative', width: 'fit-content', flexShrink: 0 }}>
                <Avatar
                  src={avatarUrl ?? undefined}
                  alt={displayName}
                  sx={{
                    width: 72,
                    height: 72,
                    flexShrink: 0,
                    mt: -5.5,
                    border: '3px solid',
                    borderColor: 'background.default',
                    bgcolor: 'grey.900',
                    color: 'primary.main',
                    fontWeight: 800,
                    fontSize: FONT_BODY,
                  }}
                >
                  {initials}
                </Avatar>
                {ownerEdit?.onEditPhotos ? (
                  <Box sx={{ position: 'absolute', right: -6, bottom: -2 }}>
                    <OwnerEditPencil
                      label="Ndrysho foton e profilit"
                      onClick={() => ownerEdit.onEditPhotos!('avatar')}
                    />
                  </Box>
                ) : null}
              </Box>

              <Stack spacing={0.5} sx={{ width: '100%', alignItems: 'flex-start' }}>
                <OwnerEditableSpot
                  field="title"
                  ownerEdit={ownerEdit}
                  label="Ndrysho titullin"
                  legacyOnClick={ownerEdit?.onEditInfo}
                  align="flex-start"
                  sx={{ maxWidth: '100%' }}
                >
                  <Typography
                    component="h1"
                    sx={{
                      fontWeight: 800,
                      fontSize: LISTING_DETAIL_MOBILE_HEADING_FONT_SIZE,
                      lineHeight: 1.2,
                      textAlign: 'left',
                    }}
                  >
                    {displayName}
                    {isVerified ? (
                      <Box
                        component="span"
                        sx={{ display: 'inline-flex', verticalAlign: 'middle', ml: 0.5, lineHeight: 0 }}
                      >
                        <ProfessionalVerifiedBadge />
                      </Box>
                    ) : null}
                    {listing.seller?.trustBadge ? (
                      <Box
                        component="span"
                        sx={{ display: 'inline-flex', verticalAlign: 'middle', ml: 0.5, lineHeight: 0 }}
                      >
                        <ListingTrustBadge size={22} />
                      </Box>
                    ) : null}
                  </Typography>
                </OwnerEditableSpot>
                <OwnerEditableSpot
                  field="category"
                  ownerEdit={ownerEdit}
                  label="Ndrysho kategorinë"
                  legacyOnClick={ownerEdit?.onEditInfo}
                >
                  <Typography
                    sx={{ fontSize: FONT_CAPTION, color: 'text.secondary', lineHeight: 1.35, textAlign: 'left' }}
                  >
                    {subtitle}
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
                      gap: 0.5,
                      justifyContent: 'flex-start',
                      alignSelf: 'flex-start',
                      minWidth: 0,
                      color: 'text.primary',
                      borderRadius: 1,
                      textAlign: 'left',
                      maxWidth: '100%',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    <MapPinIcon size={14} weight="regular" color="var(--mui-palette-primary-main)" />
                    <Typography
                      sx={{
                        fontSize: FONT_CAPTION,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {locationLine}
                    </Typography>
                  </ButtonBase>
                ) : ownerEdit?.onStartInlineEdit ? (
                  <ButtonBase
                    onClick={() => ownerEdit.onStartInlineEdit!('location')}
                    sx={{
                      display: 'inline-flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 0.5,
                      justifyContent: 'flex-start',
                      alignSelf: 'flex-start',
                      minWidth: 0,
                      color: 'text.secondary',
                      borderRadius: 1,
                      textAlign: 'left',
                    }}
                  >
                    <MapPinIcon size={14} weight="regular" color="var(--mui-palette-primary-main)" />
                    <Typography sx={{ fontSize: FONT_CAPTION, fontWeight: 600 }}>Shtoni qytetin</Typography>
                  </ButtonBase>
                ) : null}
              </Stack>
            </Stack>

            {ownerPreview ? null : (
              <StickyListingContact
                listingKind="professionals"
                listingId={listing.id}
                contactPhone={listing.contactPhone ?? listing.seller?.phone}
                listingTitle={displayName || listing.title}
                listingUrl={canonicalUrl}
              />
            )}

            {listing.description || ownerEdit?.onStartInlineEdit || ownerEdit?.onEditInfo ? (
              <Box sx={surfaceSx}>
                <OwnerEditableSpot
                  field="description"
                  ownerEdit={ownerEdit}
                  label="Ndrysho përshkrimin"
                  legacyOnClick={ownerEdit?.onEditInfo}
                  sx={{ mb: 1.25, justifyContent: 'space-between', width: '100%' }}
                >
                  <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Rreth profesionistit</Typography>
                </OwnerEditableSpot>
                {ownerEdit?.editingField === 'description' &&
                ownerEdit.inlineEditors?.description ? null : listing.description ? (
                  <RealEstateListingExpandableText
                    text={listing.description}
                    fontSize={FONT_BODY}
                    readMoreLabel="Lexo më shumë"
                    readLessLabel="Mbyll"
                  />
                ) : (
                  <Typography sx={{ fontSize: FONT_BODY, color: 'text.secondary' }}>Shtoni përshkrimin</Typography>
                )}
              </Box>
            ) : null}

            {listing.announcementTitle?.trim() && !ownerPreview ? (
              <BusinessPromoBanner
                title={listing.announcementTitle}
                subtitle={listing.announcementSubtitle}
                bannerUrl={listing.announcementBannerUrl}
                variant="detail"
              />
            ) : null}

            {serviceTags.length > 0 || ownerEdit?.onStartInlineEdit || ownerEdit?.onEditInfo ? (
              <Box sx={surfaceSx}>
                <Stack spacing={1.25}>
                  <OwnerEditableSpot
                    field="services"
                    ownerEdit={ownerEdit}
                    label="Ndrysho shërbimet"
                    legacyOnClick={ownerEdit?.onEditInfo}
                    sx={{ justifyContent: 'space-between', width: '100%' }}
                  >
                    <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Shërbimet e mia</Typography>
                  </OwnerEditableSpot>
                  {ownerEdit?.editingField === 'services' && ownerEdit.inlineEditors?.services ? null : (
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                      {serviceTags.map((tag, index) => {
                        const TagIcon = SERVICE_TAG_ICONS[index % SERVICE_TAG_ICONS.length]!;
                        return <ProductTag key={tag} label={tag} icon={TagIcon} />;
                      })}
                    </Stack>
                  )}
                </Stack>
              </Box>
            ) : null}

            {portfolio.length > 0 || ownerEdit?.onEditPortfolio ? (
              <Box>
                {portfolio.length > 0 ? (
                  <ProfessionalPortfolioSection
                    items={portfolio}
                    listingId={listing.id}
                    listingKind="professionals"
                    headerAction={
                      ownerEdit?.onEditPortfolio ? (
                        <OwnerEditPencil label="Ndrysho portofolin" onClick={ownerEdit.onEditPortfolio} />
                      ) : null
                    }
                  />
                ) : (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Punët e mia</Typography>
                    {ownerEdit?.onEditPortfolio ? (
                      <OwnerEditPencil label="Ndrysho portofolin" onClick={ownerEdit.onEditPortfolio} />
                    ) : null}
                  </Stack>
                )}
              </Box>
            ) : null}

            {mapLocation || ownerEdit?.onStartInlineEdit ? (
              <Box
                data-business-location-map
                sx={{ scrollMarginTop: 80 }}
                component="section"
                aria-labelledby="professional-location-heading"
              >
                {ownerEdit?.editingField === 'location' && ownerEdit.inlineEditors?.location ? (
                  <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>{ownerEdit.inlineEditors.location}</Box>
                ) : (
                  <Stack spacing={1.25}>
                    <Stack
                      direction="row"
                      spacing={0.75}
                      sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <Typography id="professional-location-heading" sx={{ fontWeight: 800, fontSize: FONT_BODY }}>
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
                        Shtoni qytetin ose linkun e Google Maps.
                      </Typography>
                    )}
                  </Stack>
                )}
              </Box>
            ) : null}

            {ownerPreview ? null : (
              <ProfessionalReviewSection
                ref={reviewSectionRef}
                listingId={listing.id}
                ownerId={listing.seller?.id}
                ratingAverage={listing.ratingAverage}
                reviewCount={listing.reviewCount}
                onStatsChange={onReviewStatsChange}
                onLeaveReviewAvailableChange={setLeaveReviewAvailable}
                onReviewSubmitted={() => router.refresh()}
              />
            )}

            {!ownerPreview && similarSlot ? (
              similarSlot
            ) : !ownerPreview && similar.length > 0 ? (
              <Stack spacing={1.5} sx={{ pt: 0.5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Profesionistë të ngjashëm</Typography>
                <Box sx={{ mx: -2, '& > div > div': { py: '8px 0 0 !important' } }}>
                  <ListingsCarousel slotWidth={{ xs: 260, sm: 280, md: 300 }}>
                    {similar.map((item) => (
                      <DirectoryListingCard key={item.id} listing={item} />
                    ))}
                  </ListingsCarousel>
                </Box>
              </Stack>
            ) : null}

            {ownerPreview ? null : (
              <Box sx={{ textAlign: 'center', pt: 0.5 }}>
                <HistoryBackButton href={paths.public.professionals} sx={{ fontSize: FONT_BODY }}>
                  Kthehu te lista e profesionistëve
                </HistoryBackButton>
              </Box>
            )}
          </Stack>
        </Box>
      </Box>
    </>
  );
}
