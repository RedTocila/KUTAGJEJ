'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from '@mui/material';

import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Hammer as HammerIcon } from '@phosphor-icons/react/dist/ssr/Hammer';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { PaintBrush as PaintBrushIcon } from '@phosphor-icons/react/dist/ssr/PaintBrush';
import { Ruler as RulerIcon } from '@phosphor-icons/react/dist/ssr/Ruler';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';

import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { RealEstateListingGallery } from '@/components/public/real-estate-listing-gallery';
import { StickyListingContact } from '@/components/public/sticky-listing-contact';
import { ProfessionalListingDetailDesktop } from '@/components/public/professional-listing-detail-desktop';
import {
  ProfessionalPortfolioSection,
  ProfessionalRatingSummary,
  ProfessionalVerifiedBadge,
} from '@/components/public/professional-listing-detail-ui';
import { listingDetailGalleryPlaceholder } from '@/lib/listing-gallery-placeholder';
import { LISTING_DETAIL_MOBILE_HEADING_FONT_SIZE } from '@/lib/listing-detail-layout';
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
import { ProfessionalReviewSection } from '@/components/professionals/professional-review-section';
import { paths } from '@/paths';
import { useRouter } from 'next/navigation';
import { ListingMetricsTracker } from '@/components/public/listing-metrics-tracker';
import { useListingBookmark } from '@/hooks/use-listing-bookmark';
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
  ownerPreview = false,
  ownerEdit,
}: {
  listing: PublicDirectoryListingDetail;
  canonicalUrl: string;
  similar?: PublicDirectoryListing[];
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
  const rating = React.useMemo(() => professionalRatingDisplay(listing), [listing]);
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

  const locationLine = listing.cityName ? `${listing.cityName}, Shqipëri` : null;
  const isVerified = Boolean(listing.seller?.verified);

  return (
    <>
      {ownerPreview ? null : (
        <ListingMetricsTracker
          listingKind="professionals"
          listingId={listing.id}
          city={listing.cityName}
          category={listing.category}
        />
      )}
      <ProfessionalListingDetailDesktop
        listing={listing}
        similar={ownerPreview ? [] : similar}
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
            hideSlideCount
            mediaActionSurface="glass"
            onEditPhotos={ownerEdit?.onEditPhotos}
          />
        </Box>

        <Box sx={{ px: 2, maxWidth: CONTENT_MAX, mx: 'auto', width: '100%', boxSizing: 'border-box' }}>
          <Stack spacing={2.5} sx={{ pt: 0, pb: 3 }}>
            <Stack spacing={0.75} sx={{ mt: -1.5, alignItems: 'flex-start', width: '100%' }}>
              <Box sx={{ position: 'relative', width: 'fit-content' }}>
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
                    <OwnerEditPencil label="Ndrysho foton e profilit" onClick={ownerEdit.onEditPhotos} />
                  </Box>
                ) : null}
              </Box>

              <Stack spacing={0.5} sx={{ width: '100%', alignItems: 'flex-start' }}>
                <OwnerEditableSpot
                  field="title"
                  ownerEdit={ownerEdit}
                  label="Ndrysho titullin"
                  legacyOnClick={ownerEdit?.onEditInfo}
                  align="center"
                  sx={{ maxWidth: '100%', minWidth: 0 }}
                >
                  <Typography
                    component="h1"
                    sx={{
                      fontWeight: 800,
                      fontSize: LISTING_DETAIL_MOBILE_HEADING_FONT_SIZE,
                      lineHeight: 1.2,
                      minWidth: 0,
                      flex: '0 1 auto',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textAlign: 'left',
                    }}
                  >
                    {displayName}
                  </Typography>
                  {isVerified ? (
                    <Box sx={{ flexShrink: 0, display: 'inline-flex', lineHeight: 0 }}>
                      <ProfessionalVerifiedBadge />
                    </Box>
                  ) : null}
                </OwnerEditableSpot>
                <OwnerEditableSpot
                  field="category"
                  ownerEdit={ownerEdit}
                  label="Ndrysho kategorinë"
                  legacyOnClick={ownerEdit?.onEditInfo}
                >
                  <Typography sx={{ fontSize: FONT_CAPTION, color: 'text.secondary', lineHeight: 1.35, textAlign: 'left' }}>
                    {subtitle}
                  </Typography>
                </OwnerEditableSpot>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}
                >
                  {locationLine || ownerEdit?.onStartInlineEdit || ownerEdit?.onEditInfo ? (
                    <OwnerEditableSpot
                      field="location"
                      ownerEdit={ownerEdit}
                      label="Ndrysho lokacionin"
                      legacyOnClick={ownerEdit?.onEditInfo}
                      sx={{ minWidth: 0, flex: 1 }}
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
                        {locationLine || 'Shtoni qytetin'}
                      </Typography>
                    </OwnerEditableSpot>
                  ) : (
                    <Box sx={{ flex: 1 }} />
                  )}
                  <Box sx={{ flexShrink: 0 }}>
                    <ProfessionalRatingSummary
                      rating={rating.rating}
                      reviewCount={rating.reviews}
                      starSize={14}
                    />
                  </Box>
                </Stack>
              </Stack>
            </Stack>

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
                {ownerEdit?.editingField === 'description' && ownerEdit.inlineEditors?.description ? null : listing.description ? (
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
                      return (
                        <Chip
                          key={tag}
                          icon={<TagIcon size={14} weight="duotone" color="var(--mui-palette-primary-main)" />}
                          label={tag}
                          size="small"
                          variant="outlined"
                          sx={{
                            height: 32,
                            fontWeight: 700,
                            fontSize: FONT_CAPTION,
                            borderRadius: 2,
                            borderColor: 'divider',
                            bgcolor: 'action.hover',
                            '& .MuiChip-icon': { ml: 0.75 },
                          }}
                        />
                      );
                    })}
                  </Stack>
                  )}
                </Stack>
              </Box>
            ) : null}

            {portfolio.length > 0 || ownerEdit?.onEditPortfolio ? (
              <Box sx={surfaceSx}>
                {portfolio.length > 0 ? (
                  <ProfessionalPortfolioSection
                    items={portfolio}
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

            {ownerPreview ? null : (
              <ProfessionalReviewSection
                listingId={listing.id}
                ratingAverage={listing.ratingAverage}
                reviewCount={listing.reviewCount}
                onReviewSubmitted={() => router.refresh()}
              />
            )}

            {!ownerPreview && similar.length > 0 ? (
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
                <Button
                  component={Link}
                  href={paths.public.professionals}
                  variant="text"
                  sx={{ fontWeight: 700, textTransform: 'none', fontSize: FONT_BODY }}
                >
                  Kthehu te lista e profesionistëve
                </Button>
              </Box>
            )}
          </Stack>
        </Box>

        {ownerPreview ? null : <StickyListingContact listingKind="professionals" listingId={listing.id} />}
      </Box>
    </>
  );
}
