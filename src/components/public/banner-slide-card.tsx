'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Stack, Typography } from '@mui/material';
import { ArrowUpRight as ArrowUpRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowUpRight';

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
  /** Promo artwork already includes the message — hide the HTML title. */
  hideTitleWhenImage?: boolean;
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
  hideTitleWhenImage = false,
}: BannerSlideCardProps) {
  const imageBg = imageUrl && /^https?:\/\//i.test(imageUrl) ? imageUrl : null;
  const showTitle = Boolean(title) && (!hideTitleWhenImage || !imageBg);

  const content = (
    <Box
      sx={{
        borderRadius: 4,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          minHeight: { xs: 240, sm: 260 },
          aspectRatio: { md: '4 / 3' },
          maxHeight: { md: 'min(58vh, 560px)' },
          height: { md: 'auto' },
          backgroundColor: 'background.paper',
          backgroundImage: imageBg ? `url(${imageBg})` : fallbackBg,
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
        }}
      >
        {!imageBg ? (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18), transparent 34%), radial-gradient(circle at 85% 70%, rgba(255,255,255,0.14), transparent 32%)',
              animation: eager ? 'pulseGlow 4.8s ease-in-out infinite' : 'none',
              pointerEvents: 'none',
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}
          />
        ) : null}

        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            color: 'common.white',
            p: { xs: 2.4, sm: 3, md: 3.5 },
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            background: imageBg
              ? 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.12) 42%, transparent 70%)'
              : undefined,
          }}
        >
          <Stack spacing={0.35} sx={{ maxWidth: '88%', flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
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
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {title}
              </Typography>
            ) : null}
            {subtitle ? (
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

          {href ? (
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
      </Box>
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
