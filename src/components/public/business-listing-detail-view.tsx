'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Box,
  Button,
  ButtonBase,
  FormControl,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { CalendarBlank as CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
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
  businessMenuCategories,
  businessMenuItems,
  businessOpenStatusLine,
  businessRatingDisplay,
} from '@/lib/business-listing-detail-content';
import { listingDetailGalleryPlaceholder } from '@/lib/listing-gallery-placeholder';
import type { PublicDirectoryListing, PublicDirectoryListingDetail } from '@/lib/public-listings-client';
import { BusinessListingDetailDesktop } from '@/components/public/business-listing-detail-desktop';
import { MOBILE_BOTTOM_NAV_OFFSET } from '@/lib/mobile-layout';
import { paths } from '@/paths';

const SAVED_BUSINESSES_KEY = 'kutagjej-saved-businesses';

const FONT_BODY = '0.875rem';
const FONT_CAPTION = '0.75rem';
const FONT_TITLE = '1.375rem';

const CONTENT_MAX = 480;

const surfaceSx = {
  p: 2,
  borderRadius: 3,
  bgcolor: 'rgba(var(--mui-palette-background-paperChannel) / 0.55)',
  border: '1px solid',
  borderColor: 'divider',
} as const;

function reservationDateOptions(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 14; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('sq-AL', {
      weekday: i === 0 ? 'short' : undefined,
      day: 'numeric',
      month: 'short',
    });
    out.push({ value, label: i === 0 ? `Sot, ${label}` : label });
  }
  return out;
}

const TIME_OPTIONS = ['12:00', '13:00', '14:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
const PEOPLE_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10];

function selectFieldSx() {
  return {
    flex: 1,
    minWidth: 0,
    '& .MuiOutlinedInput-root': {
      borderRadius: 2.5,
      bgcolor: 'rgba(var(--mui-palette-background-defaultChannel) / 0.85)',
      fontSize: FONT_CAPTION,
      fontWeight: 600,
    },
    '& .MuiInputLabel-root': { fontSize: FONT_CAPTION },
  } as const;
}

export function BusinessListingDetailView({
  listing,
  similar = [],
}: {
  listing: PublicDirectoryListingDetail;
  /** Reserved for metadata / future share overrides. */
  canonicalUrl?: string;
  similar?: PublicDirectoryListing[];
}) {
  const [saved, setSaved] = React.useState(false);
  const [menuCategory, setMenuCategory] = React.useState('');
  const [reserveDate, setReserveDate] = React.useState('');
  const [reserveTime, setReserveTime] = React.useState('');
  const [reservePeople, setReservePeople] = React.useState('2');
  const [savedMenuHearts, setSavedMenuHearts] = React.useState<Set<string>>(() => new Set());

  const phone = listing.contactPhone ?? listing.seller?.phone ?? null;
  const telHref = phone ? `tel:${phone.replace(/\s/g, '')}` : null;
  const rating = React.useMemo(() => businessRatingDisplay(listing), [listing]);
  const categoryLine = React.useMemo(() => businessCategorySubtitle(listing), [listing]);
  const statusLine = React.useMemo(() => businessOpenStatusLine(listing.openingHours), [listing.openingHours]);
  const menuCategories = React.useMemo(() => businessMenuCategories(listing), [listing]);
  const activeMenuCategory = menuCategory || menuCategories[0] || 'Të rekomanduara';
  const menuItems = React.useMemo(
    () => businessMenuItems(listing, activeMenuCategory),
    [listing, activeMenuCategory],
  );
  const gallery = React.useMemo(() => businessGalleryThumbs(listing.imageUrls, 4), [listing.imageUrls]);
  const dateOptions = React.useMemo(() => reservationDateOptions(), []);

  const showReservation = listing.reservationsEnabled;
  const reserveHref = listing.reservationUrl?.trim() || telHref;

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_BUSINESSES_KEY);
      const ids: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      setSaved(ids.includes(listing.id));
    } catch {
      /* noop */
    }
  }, [listing.id]);

  React.useEffect(() => {
    if (!reserveDate && dateOptions[0]) setReserveDate(dateOptions[0].value);
    if (!reserveTime) setReserveTime(TIME_OPTIONS[4] ?? '19:00');
  }, [dateOptions, reserveDate, reserveTime]);

  const toggleSave = () => {
    try {
      const raw = localStorage.getItem(SAVED_BUSINESSES_KEY);
      const ids = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
      if (ids.has(listing.id)) ids.delete(listing.id);
      else ids.add(listing.id);
      localStorage.setItem(SAVED_BUSINESSES_KEY, JSON.stringify([...ids]));
      setSaved(ids.has(listing.id));
    } catch {
      /* noop */
    }
  };

  const handleReserve = () => {
    if (listing.reservationUrl?.trim()) {
      const url = new URL(listing.reservationUrl.trim());
      if (reserveDate) url.searchParams.set('date', reserveDate);
      if (reserveTime) url.searchParams.set('time', reserveTime);
      if (reservePeople) url.searchParams.set('guests', reservePeople);
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
      return;
    }
    if (telHref) window.location.href = telHref;
  };

  const toggleMenuHeart = (id: string) => {
    setSavedMenuHearts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stickyFooterHeight = '88px';
  const scrollPadBottom = {
    xs: `calc(${stickyFooterHeight} + ${MOBILE_BOTTOM_NAV_OFFSET})`,
    md: `calc(${stickyFooterHeight} + env(safe-area-inset-bottom, 0px))`,
  };

  return (
    <>
      <BusinessListingDetailDesktop
        listing={listing}
        similar={similar}
        saved={saved}
        onToggleSave={toggleSave}
        showReservation={showReservation}
        reserveHref={reserveHref}
        reserveDate={reserveDate}
        reserveTime={reserveTime}
        reservePeople={reservePeople}
        onReserveDate={setReserveDate}
        onReserveTime={setReserveTime}
        onReservePeople={setReservePeople}
        dateOptions={dateOptions}
        timeOptions={TIME_OPTIONS}
        peopleOptions={PEOPLE_OPTIONS}
        onReserve={handleReserve}
        menuCategory={menuCategory}
        onMenuCategory={setMenuCategory}
        savedMenuHearts={savedMenuHearts}
        onToggleMenuHeart={toggleMenuHeart}
      />

      <Box sx={{ display: { xs: 'block', md: 'none' }, bgcolor: 'background.default', minHeight: '100vh', pb: scrollPadBottom }}>
      <Box sx={{ maxWidth: { md: CONTENT_MAX + 32 }, mx: 'auto', width: '100%' }}>
        <RealEstateListingGallery
          title={listing.title}
          imageUrls={listing.imageUrls}
          placeholderIcon={listingDetailGalleryPlaceholder(listing)}
          browseListHref={paths.public.businesses}
          browseListAriaLabel="Prapa te lista e bizneseve"
          bookmark={{
            saved,
            onToggle: toggleSave,
          }}
        />

        <Box sx={{ px: 2, pt: 2, pb: 3, maxWidth: CONTENT_MAX, mx: 'auto', width: '100%', boxSizing: 'border-box' }}>
          <Stack spacing={2.5}>
            {/* Title & meta */}
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start' }}>
                <Typography
                  component="h1"
                  sx={{ fontWeight: 800, fontSize: FONT_TITLE, lineHeight: 1.2, flex: 1 }}
                >
                  {listing.title}
                </Typography>
                <CheckCircleIcon size={22} weight="fill" color="var(--mui-palette-primary-main)" aria-hidden />
              </Stack>

              <Typography sx={{ fontSize: FONT_CAPTION, color: 'text.secondary', lineHeight: 1.4 }}>
                {categoryLine}
              </Typography>

              <Stack
                direction="row"
                spacing={1.5}
                sx={{ flexWrap: 'wrap', alignItems: 'center', rowGap: 0.75, columnGap: 1.5 }}
              >
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  <StarIcon size={16} weight="fill" color="var(--mui-palette-primary-main)" />
                  <Typography sx={{ fontSize: FONT_BODY, fontWeight: 700 }}>
                    {rating.rating}
                  </Typography>
                  <Typography sx={{ fontSize: FONT_CAPTION, color: 'text.secondary' }}>
                    ({rating.reviews} vlerësime)
                  </Typography>
                </Stack>
                {listing.cityName ? (
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                    <MapPinIcon size={16} weight="regular" />
                    <Typography sx={{ fontSize: FONT_CAPTION }}>{listing.cityName}, Shqipëri</Typography>
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
                  <Typography sx={{ fontSize: FONT_CAPTION, fontWeight: 600, color: 'primary.main' }}>
                    {statusLine}
                  </Typography>
                </Stack>
              ) : null}

              {listing.description ? (
                <Box>
                  <RealEstateListingExpandableText
                    text={listing.description}
                    fontSize={FONT_BODY}
                    readMoreLabel="Shiko më shumë"
                    readLessLabel="Shiko më pak"
                  />
                </Box>
              ) : null}
            </Stack>

            {/* Promo */}
            {showReservation ? (
              <ButtonBase
                onClick={handleReserve}
                sx={{ width: '100%', textAlign: 'left', display: 'block', borderRadius: 3 }}
              >
                <BusinessPromoBanner servicesHighlight={listing.servicesHighlight} variant="detail" />
              </ButtonBase>
            ) : null}

            {/* Reservation widget */}
            {showReservation ? (
              <Box sx={surfaceSx}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                  <CalendarBlankIcon size={22} weight="regular" color="var(--mui-palette-primary-main)" />
                  <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Rezervo tavolinën</Typography>
                </Stack>
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1}>
                    <FormControl size="small" sx={selectFieldSx()}>
                      <Select
                        value={reserveDate}
                        onChange={(e) => setReserveDate(e.target.value)}
                        displayEmpty
                        inputProps={{ 'aria-label': 'Data' }}
                      >
                        {dateOptions.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={selectFieldSx()}>
                      <Select
                        value={reserveTime}
                        onChange={(e) => setReserveTime(e.target.value)}
                        inputProps={{ 'aria-label': 'Ora' }}
                      >
                        {TIME_OPTIONS.map((t) => (
                          <MenuItem key={t} value={t}>
                            {t}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={selectFieldSx()}>
                      <Select
                        value={reservePeople}
                        onChange={(e) => setReservePeople(e.target.value)}
                        inputProps={{ 'aria-label': 'Persona' }}
                      >
                        {PEOPLE_OPTIONS.map((n) => (
                          <MenuItem key={n} value={String(n)}>
                            {n}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleReserve}
                    disabled={!reserveHref}
                    sx={{
                      py: 1.35,
                      borderRadius: 2.5,
                      fontWeight: 800,
                      textTransform: 'none',
                      fontSize: FONT_BODY,
                      boxShadow: 'none',
                    }}
                  >
                    Rezervo tani
                  </Button>
                </Stack>
              </Box>
            ) : null}

            {/* Menu */}
            {menuItems.length > 0 ? (
              <Stack spacing={1.5}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Menu</Typography>
                  <Button
                    variant="text"
                    endIcon={<ArrowRightIcon size={16} weight="bold" />}
                    sx={{
                      fontWeight: 700,
                      textTransform: 'none',
                      fontSize: FONT_CAPTION,
                      minWidth: 0,
                      px: 0.5,
                    }}
                  >
                    Shiko të plotë
                  </Button>
                </Stack>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    overflowX: 'auto',
                    pb: 0.5,
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                  }}
                >
                  {menuCategories.map((cat) => {
                    const active = cat === activeMenuCategory;
                    return (
                      <Button
                        key={cat}
                        size="small"
                        variant={active ? 'outlined' : 'text'}
                        onClick={() => setMenuCategory(cat)}
                        sx={{
                          flexShrink: 0,
                          borderRadius: 999,
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: FONT_CAPTION,
                          px: 1.75,
                          py: 0.65,
                          borderWidth: active ? 2 : 0,
                          borderColor: 'primary.main',
                          color: active ? 'primary.main' : 'text.secondary',
                          bgcolor: active ? alpha('#000', 0) : 'transparent',
                        }}
                      >
                        {cat}
                      </Button>
                    );
                  })}
                </Stack>
                <Stack spacing={1.5}>
                  {menuItems.map((item) => {
                    const hearted = savedMenuHearts.has(item.id);
                    return (
                      <Stack
                        key={item.id}
                        direction="row"
                        spacing={1.25}
                        sx={{ alignItems: 'flex-start' }}
                      >
                        <Box
                          sx={{
                            position: 'relative',
                            width: 72,
                            height: 72,
                            flexShrink: 0,
                            borderRadius: 2,
                            overflow: 'hidden',
                            bgcolor: 'grey.900',
                          }}
                        >
                          {item.imageUrl ? (
                            <Image src={item.imageUrl} alt="" fill sizes="72px" style={{ objectFit: 'cover' }} />
                          ) : (
                            <Box
                              sx={{
                                width: '100%',
                                height: '100%',
                                bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.12)',
                              }}
                            />
                          )}
                        </Box>
                        <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY, lineHeight: 1.25 }}>
                            {item.name}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: FONT_CAPTION,
                              color: 'text.secondary',
                              lineHeight: 1.4,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {item.description}
                          </Typography>
                          <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY, color: 'primary.main', pt: 0.25 }}>
                            {formatPrice(item.price, 'LEK')}
                          </Typography>
                        </Stack>
                        <ButtonBase
                          aria-label={hearted ? 'Hiq nga të preferuarat' : 'Shto te të preferuarat'}
                          onClick={() => toggleMenuHeart(item.id)}
                          sx={{ p: 0.5, borderRadius: 2, color: hearted ? 'primary.main' : 'text.secondary' }}
                        >
                          <BookmarkSimpleIcon size={20} weight={hearted ? 'fill' : 'regular'} />
                        </ButtonBase>
                      </Stack>
                    );
                  })}
                </Stack>
              </Stack>
            ) : null}

            {/* Ambient gallery */}
            {gallery.visible.length > 0 ? (
              <Stack spacing={1.25}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Ambient &amp; Galeri</Typography>
                  <Typography
                    component="span"
                    sx={{ fontSize: FONT_CAPTION, fontWeight: 700, color: 'primary.main' }}
                  >
                    Shiko të gjitha
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                  {gallery.visible.map((url, idx) => (
                    <Box
                      key={`${url}-${idx}`}
                      sx={{
                        position: 'relative',
                        width: 88,
                        height: 88,
                        flexShrink: 0,
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <Image src={url} alt="" fill sizes="88px" style={{ objectFit: 'cover' }} />
                    </Box>
                  ))}
                  {gallery.extraCount > 0 ? (
                    <Box
                      sx={{
                        width: 88,
                        height: 88,
                        flexShrink: 0,
                        borderRadius: 2,
                        bgcolor: 'grey.900',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>+{gallery.extraCount}</Typography>
                    </Box>
                  ) : null}
                </Stack>
              </Stack>
            ) : null}

            {/* Similar */}
            {similar.length > 0 ? (
              <Stack spacing={1.5} sx={{ pt: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Biznese të ngjashme</Typography>
                <ListingsCarousel slotWidth={{ xs: 260, sm: 280, md: 300 }}>
                  {similar.map((item) => (
                    <DirectoryListingCard key={item.id} listing={item} />
                  ))}
                </ListingsCarousel>
              </Stack>
            ) : null}

            <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'center', pt: 1 }}>
              <Button
                component={Link}
                href={paths.public.businesses}
                variant="text"
                sx={{ fontWeight: 700, textTransform: 'none', fontSize: FONT_BODY }}
              >
                Kthehu te lista e bizneseve
              </Button>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* Sticky footer */}
      <Box
        sx={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: { xs: MOBILE_BOTTOM_NAV_OFFSET, md: 0 },
          zIndex: 25,
          px: 2,
          pt: 1.25,
          pb: 1.25,
          bgcolor: 'rgba(var(--mui-palette-background-defaultChannel) / 0.96)',
          backdropFilter: 'blur(14px)',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack
          direction="row"
          spacing={1.25}
          sx={{ maxWidth: CONTENT_MAX, mx: 'auto', width: '100%' }}
        >
          <Button
            component={telHref ? 'a' : 'button'}
            href={telHref ?? undefined}
            variant="outlined"
            disabled={!telHref}
            startIcon={<PhoneIcon size={18} weight="regular" />}
            sx={{
              flex: 1,
              py: 1.25,
              borderRadius: 2.5,
              fontWeight: 800,
              textTransform: 'none',
              fontSize: FONT_BODY,
              borderWidth: 2,
              borderColor: 'divider',
              color: 'text.primary',
            }}
          >
            Telefono
          </Button>
          <Button
            variant="contained"
            startIcon={<CalendarBlankIcon size={18} weight="fill" />}
            onClick={handleReserve}
            disabled={!showReservation && !reserveHref}
            sx={{
              flex: 1.6,
              py: 1.25,
              borderRadius: 2.5,
              fontWeight: 800,
              textTransform: 'none',
              fontSize: FONT_BODY,
              boxShadow: 'none',
            }}
          >
            Rezervo tani
          </Button>
        </Stack>
      </Box>

    </Box>
    </>
  );
}
