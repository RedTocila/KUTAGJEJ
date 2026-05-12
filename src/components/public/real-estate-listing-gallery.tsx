'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { IconButton, Box, Typography, Avatar, Skeleton, Stack, ButtonBase } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { House as HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { ShareNetwork as ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';
import { ShoppingBag as ShoppingBagIcon } from '@phosphor-icons/react/dist/ssr/ShoppingBag';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { UserCircle as UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';

import { primaryMainAlpha } from '@/lib/css-var-alpha';
import type { ListingGalleryPlaceholderKey } from '@/lib/listing-gallery-placeholder';
import { paths } from '@/paths';

export type { ListingGalleryPlaceholderKey };

/** @deprecated Use `ListingGalleryPlaceholderKey`. */
export type ListingGalleryPlaceholderIcon = Extract<ListingGalleryPlaceholderKey, 'house' | 'buildings'>;

export function RealEstateListingGallery(props: {
  title: string;
  imageUrls: string[];
  placeholderIcon?: ListingGalleryPlaceholderKey;
  /** Default: `/prona` */
  browseListHref?: string;
  browseListAriaLabel?: string;
  /**
   * Pass through to next/image `sizes` for the hero (e.g. when gallery sits beside a sidebar on desktop).
   * Default `'100vw'`.
   */
  heroSizes?: string;
}) {
  const {
    title,
    imageUrls: urlsRaw,
    placeholderIcon = 'buildings',
    browseListHref = paths.public.realEstate,
    browseListAriaLabel = 'Prapa te lista e pronës',
    heroSizes = '100vw',
  } = props;
  const urls = urlsRaw.filter(Boolean);

  const [active, setActive] = React.useState(0);
  React.useEffect(() => {
    setActive(0);
  }, [urls.join('|')]);

  const current = urls[active] ?? null;
  const showPlaceholder = urls.length === 0;

  const PLACEHOLDER_BY_KEY: Record<ListingGalleryPlaceholderKey, typeof HouseIcon> = {
    house: HouseIcon,
    buildings: BuildingsIcon,
    car: CarIcon,
    briefcase: BriefcaseIcon,
    shopping: ShoppingBagIcon,
    storefront: StorefrontIcon,
    professional: UserCircleIcon,
  };
  const PlaceholderSvg = PLACEHOLDER_BY_KEY[placeholderIcon];

  const shared = React.useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text: title, url: window.location.href });
        return true;
      }
    } catch {
      /* noop */
    }
    return false;
  }, [title]);

  return (
    <Box sx={{ position: 'relative', width: '100%', bgcolor: 'background.default' }}>
      <Stack
        direction="row"
        sx={{
          position: 'absolute',
          inset: 0,
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          p: { xs: 1, sm: 1.75 },
          zIndex: 2,
          pointerEvents: 'none',
          '& .MuiIconButton-root': { pointerEvents: 'auto' },
        }}
      >
        <IconButton
          component={Link}
          href={browseListHref}
          aria-label={browseListAriaLabel}
          size="medium"
          sx={{
            bgcolor: alpha('#000', 0.45),
            color: '#fff',
            backdropFilter: 'blur(10px)',
            '&:hover': { bgcolor: alpha('#000', 0.62) },
          }}
        >
          <ArrowLeftIcon size={22} weight="regular" />
        </IconButton>
        <Stack direction="row" spacing={0.75}>
          <IconButton
            size="medium"
            aria-label="Ndaj"
            onClick={async () => {
              const ok = await shared();
              if (ok || typeof navigator === 'undefined') return;
              try {
                await navigator.clipboard.writeText(window.location.href);
              } catch {
                /* noop */
              }
            }}
            sx={{
              bgcolor: alpha('#000', 0.45),
              color: '#fff',
              backdropFilter: 'blur(10px)',
              '&:hover': { bgcolor: alpha('#000', 0.62) },
            }}
          >
            <ShareNetworkIcon size={20} weight="regular" color="currentColor" />
          </IconButton>
          <IconButton
            size="medium"
            aria-label="Ruaj njoftimin"
            disabled
            sx={{
              bgcolor: alpha('#000', 0.45),
              color: '#fff',
              backdropFilter: 'blur(10px)',
              '&:hover': { bgcolor: alpha('#000', 0.62) },
              '&.Mui-disabled': {
                bgcolor: alpha('#000', 0.45),
                color: '#fff',
                opacity: 1,
              },
            }}
          >
            <BookmarkSimpleIcon size={20} weight="regular" color="currentColor" />
          </IconButton>
        </Stack>
      </Stack>

      <Box
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: { xs: '4 / 5', sm: '16 / 10' },
          maxHeight: { sm: 'min(520px, 68vh)', md: 560 },
          overflow: 'hidden',
          mx: 'auto',
        }}
      >
        {showPlaceholder ? (
          <Stack
            sx={{
              position: 'absolute',
              inset: 0,
              alignItems: 'center',
              justifyContent: 'center',
              // `primaryMainAlpha` uses `--mui-palette-primary-mainChannel`; do not pass `palette.primary.main` to `alpha()` (often `var(...)`).
              background: (theme) =>
                theme.palette.mode === 'dark'
                  ? `linear-gradient(145deg, ${primaryMainAlpha(0.14)} 0%, ${theme.palette.grey[900]} 45%, rgba(0,0,0,0.9) 100%)`
                  : `linear-gradient(145deg, ${primaryMainAlpha(0.12)} 0%, ${theme.palette.grey[50]} 50%, ${primaryMainAlpha(0.06)} 100%)`,
            }}
          >
            <Avatar
              sx={{
                width: 88,
                height: 88,
                bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.16 : 0.12),
                color: 'primary.main',
                border: `1px solid ${primaryMainAlpha(0.38)}`,
              }}
              variant="rounded"
              aria-hidden
            >
              <PlaceholderSvg weight="regular" size={42} />
            </Avatar>
            <Typography
              sx={{ mt: 2.5, maxWidth: 280, px: 2, textAlign: 'center', color: 'text.primary', opacity: 0.92, fontSize: '0.9rem', fontWeight: 600 }}
            >
              {title}
            </Typography>
          </Stack>
        ) : current ? (
          <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
            <Image src={current} alt={title} fill priority sizes={heroSizes} style={{ objectFit: 'cover' }} />
          </Box>
        ) : (
          <Skeleton variant="rectangular" sx={{ position: 'absolute', inset: 0, height: 1 }} />
        )}

        {!showPlaceholder ? (
          <Typography
            component="span"
            sx={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              px: 1.25,
              py: 0.5,
              borderRadius: 1,
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              bgcolor: alpha('#000', 0.55),
              color: '#fff',
              backdropFilter: 'blur(10px)',
              zIndex: 1,
            }}
          >
            {`${active + 1}/${urls.length}`}
          </Typography>
        ) : null}
      </Box>

      {!showPlaceholder && urls.length > 1 ? (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            px: { xs: 1.25, sm: 2 },
            pb: { xs: 1.25, sm: 1.75 },
            pt: 1.25,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {urls.map((url, idx) => (
            <ButtonBase
              key={url}
              focusRipple
              aria-label={`Fotoja ${idx + 1}`}
              aria-pressed={idx === active}
              onClick={() => setActive(idx)}
              sx={{
                flex: '0 0 auto',
                borderRadius: 1.25,
                overflow: 'hidden',
                outline: idx === active ? '2px solid' : '1px solid',
                outlineOffset: 2,
                outlineColor: idx === active ? 'primary.main' : 'divider',
                width: { xs: 72, sm: 88 },
                height: { xs: 52, sm: 62 },
              }}
            >
              <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                <Image src={url} alt="" fill sizes="120px" style={{ objectFit: 'cover' }} />
              </Box>
            </ButtonBase>
          ))}
        </Stack>
      ) : null}
    </Box>
  );
}
