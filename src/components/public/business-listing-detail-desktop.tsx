'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Container,
  Divider,
  FormControl,
  Grid,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { CalendarBlank as CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { BusinessVerifiedBadge } from '@/components/public/professional-listing-detail-ui';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Phone as PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';

import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { BusinessPromoBanner } from '@/components/public/listing-cards/business-promo-banner';
import { formatPrice } from '@/components/public/listing-cards/format-helpers';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { RealEstateListingGallery } from '@/components/public/real-estate-listing-gallery';
import {
  businessCategorySubtitle,
  businessGalleryThumbs,
  businessMenuCategoryNames,
  businessMenuItemsForCategory,
  businessOpenStatusLine,
  businessRatingDisplay,
  type BusinessMenuItemView,
} from '@/lib/business-listing-detail-content';
import { BusinessReviewSection } from '@/components/businesses/business-review-section';
import { listingDetailGalleryPlaceholder } from '@/lib/listing-gallery-placeholder';
import {
  LISTING_DETAIL_HERO_GALLERY_MAX_WIDTH_PX,
  LISTING_DETAIL_HERO_IMAGE_SIZES,
} from '@/lib/listing-detail-layout';
import type { PublicDirectoryListing, PublicDirectoryListingDetail } from '@/lib/public-listings-client';
import { paths } from '@/paths';

const surfaceSx = {
  p: 2.5,
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'rgba(var(--mui-palette-background-paperChannel) / 0.55)',
} as const;

function selectFieldSx() {
  return {
    flex: 1,
    minWidth: 0,
    '& .MuiOutlinedInput-root': {
      borderRadius: 2.5,
      bgcolor: 'rgba(var(--mui-palette-background-defaultChannel) / 0.85)',
      fontSize: '0.8rem',
      fontWeight: 600,
    },
  } as const;
}

function MenuItemRow({
  item,
  hearted,
  onToggleHeart,
}: {
  item: BusinessMenuItemView;
  hearted: boolean;
  onToggleHeart: () => void;
}) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
      <Box
        sx={{
          position: 'relative',
          width: 80,
          height: 80,
          flexShrink: 0,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'grey.900',
        }}
      >
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt="" fill sizes="80px" style={{ objectFit: 'cover' }} />
        ) : (
          <Box sx={{ width: '100%', height: '100%', bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.12)' }} />
        )}
      </Box>
      <Stack spacing={0.35} sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.25 }}>{item.name}</Typography>
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', lineHeight: 1.45 }}>{item.description}</Typography>
        <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: 'primary.main', pt: 0.25 }}>
          {formatPrice(item.price, item.currency)}
        </Typography>
      </Stack>
      <ButtonBase
        aria-label={hearted ? 'Hiq nga të preferuarat' : 'Shto te të preferuarat'}
        onClick={onToggleHeart}
        sx={{ p: 0.5, borderRadius: 2, color: hearted ? 'primary.main' : 'text.secondary' }}
      >
        <BookmarkSimpleIcon size={20} weight={hearted ? 'fill' : 'regular'} />
      </ButtonBase>
    </Stack>
  );
}

export function BusinessListingDetailDesktop({
  listing,
  similar,
  saved,
  saveCount,
  onToggleSave,
  showReservation,
  reserveHref,
  reserveDate,
  reserveTime,
  reservePeople,
  onReserveDate,
  onReserveTime,
  onReservePeople,
  dateOptions,
  timeOptions,
  peopleOptions,
  onReserve,
  reserveGuestName,
  reserveGuestPhone,
  onReserveGuestName,
  onReserveGuestPhone,
  usePlatformReservation,
  reserveFeedback,
  reserveSubmitting,
  menuCategory,
  onMenuCategory,
  savedMenuHearts,
  onToggleMenuHeart,
}: {
  listing: PublicDirectoryListingDetail;
  similar: PublicDirectoryListing[];
  saved: boolean;
  saveCount: number;
  onToggleSave: () => void;
  showReservation: boolean;
  reserveHref: string | null;
  reserveDate: string;
  reserveTime: string;
  reservePeople: string;
  onReserveDate: (v: string) => void;
  onReserveTime: (v: string) => void;
  onReservePeople: (v: string) => void;
  dateOptions: { value: string; label: string }[];
  timeOptions: string[];
  peopleOptions: number[];
  onReserve: () => void;
  reserveGuestName: string;
  reserveGuestPhone: string;
  onReserveGuestName: (v: string) => void;
  onReserveGuestPhone: (v: string) => void;
  usePlatformReservation: boolean;
  reserveFeedback: string | null;
  reserveSubmitting: boolean;
  menuCategory: string;
  onMenuCategory: (cat: string) => void;
  savedMenuHearts: Set<string>;
  onToggleMenuHeart: (id: string) => void;
}) {
  const rating = React.useMemo(() => businessRatingDisplay(listing), [listing]);
  const categoryLine = React.useMemo(() => businessCategorySubtitle(listing), [listing]);
  const statusLine = React.useMemo(() => businessOpenStatusLine(listing), [listing]);
  const menuCategories = React.useMemo(() => businessMenuCategoryNames(listing), [listing]);
  const activeMenuCategory = menuCategory || menuCategories[0] || '';
  const menuItems = React.useMemo(
    () => (activeMenuCategory ? businessMenuItemsForCategory(listing, activeMenuCategory) : []),
    [listing, activeMenuCategory],
  );
  const gallery = React.useMemo(() => businessGalleryThumbs(listing.imageUrls, 6), [listing.imageUrls]);
  const telHref = listing.contactPhone ?? listing.seller?.phone ?? null;
  const phoneHref = telHref ? `tel:${telHref.replace(/\s/g, '')}` : null;

  return (
    <Box component="article" sx={{ bgcolor: 'background.default', pb: 6, display: { xs: 'none', md: 'block' } }}>
      <Container maxWidth="lg" sx={{ px: { md: 3 }, pt: 2, pb: 2 }}>
        <Stack spacing={4}>
          <Box
            sx={(theme) => ({
              width: '100%',
              borderRadius: 3,
              overflow: 'hidden',
              bgcolor: 'background.paper',
              border: 'none',
              boxShadow:
                theme.palette.mode === 'dark'
                  ? `0 20px 50px ${alpha(theme.palette.common.black, 0.35)}`
                  : '0 12px 40px rgba(0, 0, 0, 0.08)',
            })}
          >
          <Stack direction="row" sx={{ alignItems: 'stretch', minHeight: 0, width: '100%' }}>
            <Box
              sx={{
                flex: `1 1 ${LISTING_DETAIL_HERO_GALLERY_MAX_WIDTH_PX}px`,
                maxWidth: LISTING_DETAIL_HERO_GALLERY_MAX_WIDTH_PX,
                minWidth: 0,
                width: '100%',
                overflow: 'hidden',
              }}
            >
              <RealEstateListingGallery
                title={listing.title}
                imageUrls={listing.imageUrls}
                placeholderIcon={listingDetailGalleryPlaceholder(listing)}
                browseListHref={paths.public.businesses}
                browseListAriaLabel="Prapa te lista e bizneseve"
                heroSizes={LISTING_DETAIL_HERO_IMAGE_SIZES}
                listingKind="businesses"
                listingId={listing.id}
                shareCount={listing.shareCount}
                saveCount={saveCount}
                bookmark={{ saved, onToggle: onToggleSave }}
              />
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                flex: '0 0 auto',
                width: 'min(380px, 34%)',
                minWidth: 300,
                maxWidth: 400,
                bgcolor: 'background.paper',
                p: 2.5,
              }}
            >
              <Stack spacing={2} sx={{ width: '100%' }}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start' }}>
                    <Typography component="h1" sx={{ fontWeight: 800, fontSize: '1.35rem', lineHeight: 1.2, flex: 1 }}>
                      {listing.title}
                    </Typography>
                    <BusinessVerifiedBadge />
                  </Stack>
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', lineHeight: 1.4 }}>{categoryLine}</Typography>
                  <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                    {rating.rating ? (
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                        <StarIcon size={16} weight="fill" color="var(--mui-palette-primary-main)" />
                        <Typography sx={{ fontWeight: 700 }}>{rating.rating}</Typography>
                        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                          ({rating.reviews} vlerësime)
                        </Typography>
                      </Stack>
                    ) : null}
                    {listing.cityName ? (
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                        <MapPinIcon size={16} weight="regular" />
                        <Typography sx={{ fontSize: '0.8rem' }}>{listing.cityName}</Typography>
                      </Stack>
                    ) : null}
                  </Stack>
                  {statusLine ? (
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
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'primary.main' }}>{statusLine}</Typography>
                    </Stack>
                  ) : null}
                </Stack>

                <Divider />

                {showReservation ? (
                  <ButtonBase onClick={onReserve} sx={{ width: '100%', textAlign: 'left', display: 'block', borderRadius: 3 }}>
                    <BusinessPromoBanner servicesHighlight={listing.servicesHighlight} variant="detail" />
                  </ButtonBase>
                ) : null}

                {showReservation ? (
                  <Box sx={{ ...surfaceSx, p: 2 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                      <CalendarBlankIcon size={22} weight="regular" color="var(--mui-palette-primary-main)" />
                      <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Rezervo tavolinën</Typography>
                    </Stack>
                    <Stack spacing={1.25}>
                      <Stack direction="row" spacing={1}>
                        <FormControl size="small" sx={selectFieldSx()}>
                          <Select value={reserveDate} onChange={(e) => onReserveDate(e.target.value)} inputProps={{ 'aria-label': 'Data' }}>
                            {dateOptions.map((opt) => (
                              <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl size="small" sx={selectFieldSx()}>
                          <Select value={reserveTime} onChange={(e) => onReserveTime(e.target.value)} inputProps={{ 'aria-label': 'Ora' }}>
                            {timeOptions.map((t) => (
                              <MenuItem key={t} value={t}>
                                {t}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl size="small" sx={selectFieldSx()}>
                          <Select
                            value={reservePeople}
                            onChange={(e) => onReservePeople(e.target.value)}
                            inputProps={{ 'aria-label': 'Persona' }}
                          >
                            {peopleOptions.map((n) => (
                              <MenuItem key={n} value={String(n)}>
                                {n}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Stack>
                      {usePlatformReservation ? (
                        <Stack spacing={1}>
                          <TextField
                            size="small"
                            label="Emri i plotë"
                            value={reserveGuestName}
                            onChange={(e) => onReserveGuestName(e.target.value)}
                            fullWidth
                          />
                          <TextField
                            size="small"
                            label="Telefoni"
                            value={reserveGuestPhone}
                            onChange={(e) => onReserveGuestPhone(e.target.value)}
                            fullWidth
                          />
                        </Stack>
                      ) : null}
                      {reserveFeedback ? (
                        <Alert severity={reserveFeedback.includes('dërgua') ? 'success' : 'warning'} sx={{ py: 0 }}>
                          {reserveFeedback}
                        </Alert>
                      ) : null}
                      <Stack direction="row" spacing={1}>
                        <Button
                          component={phoneHref ? 'a' : 'button'}
                          href={phoneHref ?? undefined}
                          variant="outlined"
                          disabled={!phoneHref}
                          startIcon={<PhoneIcon size={18} weight="regular" />}
                          sx={{
                            flex: 1,
                            py: 1.25,
                            borderRadius: 2.5,
                            fontWeight: 800,
                            textTransform: 'none',
                            borderWidth: 2,
                          }}
                        >
                          Telefono
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={<CalendarBlankIcon size={18} weight="fill" />}
                          onClick={onReserve}
                          disabled={usePlatformReservation ? reserveSubmitting : !reserveHref}
                          sx={{
                            flex: 1.4,
                            py: 1.25,
                            borderRadius: 2.5,
                            fontWeight: 800,
                            textTransform: 'none',
                            boxShadow: 'none',
                          }}
                        >
                          {reserveSubmitting ? 'Duke dërguar…' : 'Rezervo tani'}
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                ) : (
                  <Stack direction="row" spacing={1}>
                    <Button
                      component={phoneHref ? 'a' : 'button'}
                      href={phoneHref ?? undefined}
                      variant="outlined"
                      disabled={!phoneHref}
                      fullWidth
                      startIcon={<PhoneIcon size={18} weight="regular" />}
                      sx={{ py: 1.25, borderRadius: 2.5, fontWeight: 800, textTransform: 'none', borderWidth: 2 }}
                    >
                      Telefono
                    </Button>
                  </Stack>
                )}
              </Stack>
            </Box>
          </Stack>
          </Box>

          <Stack spacing={4} sx={{ width: '100%' }}>
          {listing.description ? (
            <Box sx={surfaceSx}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', mb: 1.5 }}>Rreth biznesit</Typography>
              <RealEstateListingExpandableText
                text={listing.description}
                fontSize="0.9rem"
                readMoreLabel="Shiko më shumë"
                readLessLabel="Shiko më pak"
              />
            </Box>
          ) : null}

          <Box sx={surfaceSx}>
            <BusinessReviewSection
              listingId={listing.id}
              ratingAverage={listing.ratingAverage}
              reviewCount={listing.reviewCount}
            />
          </Box>

          {menuItems.length > 0 ? (
            <Box sx={surfaceSx}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }}>Menu</Typography>
                <Button
                  variant="text"
                  endIcon={<ArrowRightIcon size={16} weight="bold" />}
                  sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.8rem' }}
                >
                  Shiko të plotë
                </Button>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {menuCategories.map((cat) => {
                  const active = cat === activeMenuCategory;
                  return (
                    <Button
                      key={cat}
                      size="small"
                      variant={active ? 'outlined' : 'text'}
                      onClick={() => onMenuCategory(cat)}
                      sx={{
                        borderRadius: 999,
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        borderWidth: active ? 2 : 0,
                        borderColor: 'primary.main',
                        color: active ? 'primary.main' : 'text.secondary',
                      }}
                    >
                      {cat}
                    </Button>
                  );
                })}
              </Stack>
              <Grid container spacing={2}>
                {menuItems.map((item) => (
                  <Grid key={item.id} size={6}>
                    <MenuItemRow
                      item={item}
                      hearted={savedMenuHearts.has(item.id)}
                      onToggleHeart={() => onToggleMenuHeart(item.id)}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : null}

          {gallery.visible.length > 0 ? (
            <Stack spacing={1.5}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }}>Ambient &amp; Galeri</Typography>
              <Stack direction="row" spacing={1.25} sx={{ flexWrap: 'wrap' }}>
                {gallery.visible.map((url, idx) => (
                  <Box
                    key={`${url}-${idx}`}
                    sx={{ position: 'relative', width: 140, height: 140, borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}
                  >
                    <Image src={url} alt="" fill sizes="140px" style={{ objectFit: 'cover' }} />
                  </Box>
                ))}
                {gallery.extraCount > 0 ? (
                  <Box
                    sx={{
                      width: 140,
                      height: 140,
                      borderRadius: 2,
                      bgcolor: 'grey.900',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Typography sx={{ fontWeight: 800 }}>+{gallery.extraCount}</Typography>
                  </Box>
                ) : null}
              </Stack>
            </Stack>
          ) : null}

          {similar.length > 0 ? (
            <Stack spacing={2}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }}>Biznese të ngjashme</Typography>
              <ListingsCarousel slotWidth={{ md: 300 }}>
                {similar.map((item) => (
                  <DirectoryListingCard key={item.id} listing={item} />
                ))}
              </ListingsCarousel>
            </Stack>
          ) : null}

          <Box sx={{ textAlign: 'center' }}>
            <Button component={Link} href={paths.public.businesses} variant="text" sx={{ fontWeight: 700, textTransform: 'none' }}>
              Kthehu te lista e bizneseve
            </Button>
          </Box>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
