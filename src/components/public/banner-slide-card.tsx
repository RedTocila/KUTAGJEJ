'use client';

import * as React from 'react';
import Image from 'next/image';
import RouterLink from 'next/link';
import { Box, Stack, Typography } from '@mui/material';
import { ArrowUpRight as ArrowUpRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowUpRight';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';

import { homeBannerImageUrl } from '@/lib/storage-image';
import { MOTION } from '@/styles/motion';

export const BANNER_SLIDE_VISUALS = [
  {
    bg: 'radial-gradient(1200px 380px at 8% 12%, #8DFF2A 0%, transparent 45%), linear-gradient(135deg, #285d00 0%, #3a8c00 46%, #75be14 100%)',
  },
  {
    bg: 'radial-gradient(900px 320px at 95% 10%, #7dd3fc 0%, transparent 42%), linear-gradient(135deg, #0b2f6d 0%, #1748a8 45%, #2563eb 100%)',
  },
  {
    bg: 'radial-gradient(900px 320px at 15% 85%, #fef08a 0%, transparent 42%), linear-gradient(135deg, #6a11cb 0%, #8b2cf5 48%, #b270ff 100%)',
  },
  {
    bg: 'radial-gradient(900px 320px at 80% 20%, #fb923c 0%, transparent 42%), linear-gradient(135deg, #9a3412 0%, #c2410c 48%, #f97316 100%)',
  },
  {
    bg: 'radial-gradient(900px 320px at 10% 80%, #67e8f9 0%, transparent 42%), linear-gradient(135deg, #0e7490 0%, #0891b2 48%, #22d3ee 100%)',
  },
  {
    bg: 'radial-gradient(900px 320px at 90% 75%, #f9a8d4 0%, transparent 42%), linear-gradient(135deg, #9d174d 0%, #db2777 48%, #f472b6 100%)',
  },
  {
    bg: 'radial-gradient(900px 320px at 20% 15%, #a3e635 0%, transparent 42%), linear-gradient(135deg, #365314 0%, #4d7c0f 48%, #84cc16 100%)',
  },
] as const;

export type BannerSlideCardProps = {
  href: string | null;
  suppressNavRef: React.MutableRefObject<boolean>;
  imageUrl?: string | null;
  fallbackBg?: string;
  eager?: boolean;
  title?: string | null;
  subtitle?: string | null;
  /** Draw the card frame around this slide. */
  bordered?: boolean;
  /** Optional right-side metadata shown in place of the navigation arrow. */
  bottomRightLabel?: string | null;
  /** Optional view count shown as an uncontained overlay in the image's top-right. */
  topRightLabel?: string | null;
  /** Optional label shown in a contained badge at the image's bottom-left. */
  bottomLeftLabel?: string | null;
  /** Maximum title lines. */
  titleMaxLines?: number;
  /** Promo artwork already includes the message — hide the HTML title. */
  hideTitleWhenImage?: boolean;
  /** Category listing slides keep copy on a readable surface below the image. */
  contentPlacement?: 'overlay' | 'below';
  /** First visible slide only — homepage LCP. */
  priority?: boolean;
};

/**
 * Shared contained-slide chrome: rounded card, bottom-left copy, frosted arrow.
 */
export function BannerSlideCard({
  href,
  suppressNavRef,
  imageUrl,
  fallbackBg = BANNER_SLIDE_VISUALS[0].bg,
  eager = true,
  title,
  subtitle,
  bordered = false,
  bottomRightLabel = null,
  topRightLabel = null,
  bottomLeftLabel = null,
  titleMaxLines = 2,
  hideTitleWhenImage = false,
  contentPlacement = 'overlay',
  priority = false,
}: BannerSlideCardProps) {
  const rawImage = imageUrl && /^https?:\/\//i.test(imageUrl) ? imageUrl : null;
  const imageSrc = rawImage ? (homeBannerImageUrl(rawImage) ?? rawImage) : null;
  const showTitle = Boolean(title) && (!hideTitleWhenImage || !imageSrc);
  const contentBelowImage = contentPlacement === 'below';

  const content = (
    <Box
      sx={(theme) => ({
        borderRadius: contentBelowImage ? 2.5 : 4,
        overflow: contentBelowImage ? 'visible' : 'hidden',
        border: bordered ? '1px solid' : 'none',
        borderColor: bordered ? 'divider' : 'transparent',
        backgroundColor: contentBelowImage ? 'transparent' : '#e5efdc',
        // Flat in light mode; keep soft lift in dark.
        boxShadow: 'none',
        ...theme.applyStyles('dark', {
          backgroundColor: contentBelowImage ? 'transparent' : 'var(--mui-palette-background-paper)',
          boxShadow: contentBelowImage ? 'none' : '0 10px 28px rgba(0,0,0,0.18)',
        }),
      })}
    >
      <Box
        sx={(theme) => ({
          position: 'relative',
          width: '100%',
          ...(contentBelowImage
            ? {
                // Keep the original full-height category image proportions;
                // the title and price remain on the separate surface below.
                minHeight: { xs: 240, sm: 260 },
                aspectRatio: { md: '4 / 3' },
                maxHeight: { md: 'min(58vh, 560px)' },
                height: { md: 'auto' },
                borderRadius: 2.5,
                border: 'none',
                borderColor: 'transparent',
                boxSizing: 'border-box',
              }
            : {
                minHeight: { xs: 240, sm: 260 },
                aspectRatio: { md: '4 / 3' },
                maxHeight: { md: 'min(58vh, 560px)' },
                height: { md: 'auto' },
              }),
          overflow: 'hidden',
          backgroundColor: contentBelowImage ? 'transparent' : 'background.paper',
          backgroundImage: theme.palette.mode === 'dark' && !imageSrc ? fallbackBg : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          contentVisibility: eager ? 'visible' : 'auto',
          containIntrinsicSize: '240px',
          '@keyframes pulseGlow': {
            '0%,100%': { opacity: 0.36 },
            '50%': { opacity: 0.66 },
          },
          transition: `transform ${MOTION.fast} ${MOTION.ease}, filter ${MOTION.fast} ${MOTION.ease}`,
          ...(href
            ? {
                '&:hover': { filter: 'brightness(1.04)' },
                '&:active': { transform: 'scale(0.992)' },
              }
            : null),
        })}
      >
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={title || ''}
            fill
            sizes="(max-width: 900px) 100vw, min(1400px, 92vw)"
            priority={priority}
            loading={priority ? undefined : eager ? 'eager' : 'lazy'}
            style={{ objectFit: 'cover' }}
          />
        ) : null}
        {topRightLabel ? (
          <Stack
            direction="row"
            spacing={0.55}
            aria-label={`${topRightLabel} views`}
            sx={{
              position: 'absolute',
              top: { xs: 12, sm: 16, md: 20 },
              right: { xs: 12, sm: 16, md: 20 },
              zIndex: 2,
              alignItems: 'center',
              color: '#fff',
              filter: 'drop-shadow(0 1px 5px rgba(0,0,0,0.68))',
            }}
          >
            <EyeIcon size={20} weight="regular" />
            <Typography
              component="span"
              sx={{ fontWeight: 750, fontSize: { xs: '0.9rem', sm: '0.98rem' }, lineHeight: 1 }}
            >
              {topRightLabel}
            </Typography>
          </Stack>
        ) : null}
        {!imageSrc ? (
          <Box
            sx={(theme) => ({
              position: 'absolute',
              inset: 0,
              // Light mode: no glow overlay — flat slide art.
              background: 'none',
              pointerEvents: 'none',
              ...theme.applyStyles('dark', {
                background:
                  'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18), transparent 34%), radial-gradient(circle at 85% 70%, rgba(255,255,255,0.14), transparent 32%)',
                animation: eager ? 'pulseGlow 4.8s ease-in-out infinite' : 'none',
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
              }),
            })}
          />
        ) : null}

        {!contentBelowImage ? (
          <Stack
            direction="row"
            spacing={bottomRightLabel ? 0 : 1.5}
            sx={(theme) => ({
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              color: 'common.white',
              p: { xs: 2.4, sm: 3, md: 3.5 },
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              ...(bottomRightLabel
                ? {
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 36%)',
                    columnGap: 1.5,
                  }
                : null),
              // Light mode: no bottom vignette on image slides.
              background: 'none',
              ...theme.applyStyles('dark', {
                background: imageSrc
                  ? 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.12) 42%, transparent 70%)'
                  : 'none',
              }),
            })}
          >
            <Stack
              spacing={0.35}
              sx={{
                maxWidth: bottomRightLabel ? 'none' : '88%',
                flex: '1 1 0',
                minWidth: 0,
                width: '100%',
                alignItems: 'flex-start',
              }}
            >
              {showTitle ? (
                <Typography
                  component="h2"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: '1.2rem', sm: '1.35rem', md: '1.6rem' },
                    lineHeight: 1.15,
                    letterSpacing: '-0.02em',
                    textAlign: 'left',
                    textShadow: '0 1px 18px rgba(0,0,0,0.35)',
                    display: '-webkit-box',
                    WebkitLineClamp: titleMaxLines,
                    WebkitBoxOrient: 'vertical',
                    width: '100%',
                    minWidth: 0,
                    overflow: 'hidden',
                    whiteSpace: titleMaxLines === 1 ? 'nowrap' : 'normal',
                    textOverflow: titleMaxLines === 1 ? 'ellipsis' : undefined,
                  }}
                >
                  {title}
                </Typography>
              ) : null}
              {subtitle && !bottomRightLabel ? (
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '0.95rem', sm: '1.05rem' },
                    lineHeight: 1.2,
                    color: 'primary.main',
                    textShadow: '0 1px 12px rgba(0,0,0,0.35)',
                  }}
                >
                  {subtitle}
                </Typography>
              ) : null}
            </Stack>

            {bottomRightLabel ? (
              <Typography
                sx={{
                  width: '100%',
                  maxWidth: 'none',
                  flex: 'none',
                  minWidth: 0,
                  fontWeight: 800,
                  fontSize: { xs: '0.95rem', sm: '1.05rem' },
                  lineHeight: 1.2,
                  color: 'primary.main',
                  textAlign: 'right',
                  textShadow: '0 1px 12px rgba(0,0,0,0.35)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {bottomRightLabel}
              </Typography>
            ) : href ? (
              <Box
                aria-hidden
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgba(255,255,255,0.18)',
                  border: '1px solid rgba(255,255,255,0.28)',
                  backdropFilter: 'blur(8px)',
                  color: '#fff',
                  mb: 0.25,
                }}
              >
                <ArrowUpRightIcon size={18} weight="bold" />
              </Box>
            ) : null}
          </Stack>
        ) : null}
        {contentBelowImage && href ? (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              right: { xs: 10, sm: 14, md: 18 },
              bottom: { xs: 10, sm: 14, md: 18 },
              zIndex: 2,
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.28)',
              backdropFilter: 'blur(8px)',
              color: '#fff',
            }}
          >
            <ArrowUpRightIcon size={18} weight="bold" />
          </Box>
        ) : null}
        {contentBelowImage && bottomLeftLabel ? (
          <Box
            sx={(theme) => ({
              position: 'absolute',
              left: { xs: 10, sm: 14, md: 18 },
              bottom: { xs: 10, sm: 14, md: 18 },
              zIndex: 2,
              maxWidth: 'calc(100% - 68px)',
              px: { xs: 1.25, sm: 1.5 },
              py: { xs: 0.9, sm: 1 },
              borderRadius: 999,
              bgcolor: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.28)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              textShadow: '0 1px 10px rgba(0, 0, 0, 0.5)',
              ...theme.applyStyles('dark', {
                bgcolor: 'rgba(255,255,255,0.18)',
              }),
            })}
          >
            <Typography
              sx={{
                color: 'primary.main',
                fontWeight: 800,
                fontSize: { xs: '1.2rem', sm: '1.35rem', md: '1.45rem' },
                lineHeight: 1.15,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {bottomLeftLabel}
            </Typography>
          </Box>
        ) : null}
      </Box>
      {contentBelowImage ? (
        <Stack
          direction="row"
          spacing={1.25}
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            minWidth: 0,
            px: { xs: 0.35, sm: 0.5 },
            py: { xs: 0.85, sm: 1 },
          }}
        >
          <Typography
            component="h2"
            sx={{
              minWidth: 0,
              flex: 1,
              color: 'text.primary',
              fontWeight: 750,
              fontSize: { xs: '0.98rem', sm: '1.05rem' },
              lineHeight: 1.2,
              letterSpacing: '-0.015em',
              display: '-webkit-box',
              WebkitLineClamp: titleMaxLines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              whiteSpace: titleMaxLines === 1 ? 'nowrap' : 'normal',
              textOverflow: titleMaxLines === 1 ? 'ellipsis' : undefined,
            }}
          >
            {title}
          </Typography>
          {bottomRightLabel ? (
            <Typography
              sx={{
                flexShrink: 0,
                maxWidth: '42%',
                color: 'primary.main',
                fontWeight: 800,
                fontSize: { xs: '0.98rem', sm: '1.05rem' },
                lineHeight: 1.2,
                textAlign: 'right',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {bottomRightLabel}
            </Typography>
          ) : null}
        </Stack>
      ) : null}
    </Box>
  );

  if (!href) return content;

  return (
    <Box
      component={RouterLink}
      href={href}
      onClick={(event: React.MouseEvent) => {
        if (suppressNavRef.current) {
          event.preventDefault();
          suppressNavRef.current = false;
        }
      }}
      sx={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {content}
    </Box>
  );
}
