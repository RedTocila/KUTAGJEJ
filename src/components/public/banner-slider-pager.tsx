'use client';

import * as React from 'react';
import { Box, IconButton, Stack } from '@mui/material';
import { Pause as PauseIcon } from '@phosphor-icons/react/dist/ssr/Pause';
import { Play as PlayIcon } from '@phosphor-icons/react/dist/ssr/Play';

import { MOTION } from '@/styles/motion';

const DOT_MS = MOTION.fast;

function bannerDotSize(distance: number): number {
  if (distance === 0) return 9;
  if (distance === 1) return 7;
  if (distance === 2) return 5.5;
  return 4.5;
}

export type BannerSliderPagerProps = {
  slideCount: number;
  idx: number;
  autoplay: boolean;
  goToSlide: (index: number) => void;
  toggleAutoplay: () => void;
  tablistLabel: string;
  pauseLabel: string;
  playLabel: string;
  slideLabel: (index: number) => string;
};

/** Focus-style dots + play/pause — shared by home banners and category sliders. */
export function BannerSliderPager({
  slideCount,
  idx,
  autoplay,
  goToSlide,
  toggleAutoplay,
  tablistLabel,
  pauseLabel,
  playLabel,
  slideLabel,
}: BannerSliderPagerProps) {
  const [playBurst, setPlayBurst] = React.useState(false);

  if (slideCount < 2) return null;

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        minHeight: 32,
        pt: 0.35,
      }}
    >
      <Stack
        direction="row"
        spacing={0.7}
        role="tablist"
        aria-label={tablistLabel}
        sx={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          transform: 'translateX(-50%)',
          alignItems: 'center',
          pointerEvents: 'auto',
        }}
      >
        {Array.from({ length: slideCount }, (_, i) => {
          const dist = Math.abs(i - idx);
          const size = bannerDotSize(dist);
          const active = i === idx;
          return (
            <Box
              key={i}
              component="button"
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={slideLabel(i)}
              onClick={() => goToSlide(i)}
              sx={{
                width: size,
                height: size,
                borderRadius: '50%',
                border: 0,
                p: 0,
                cursor: 'pointer',
                flexShrink: 0,
                transition: `width ${DOT_MS} ${MOTION.ease}, height ${DOT_MS} ${MOTION.ease}, background-color ${DOT_MS} ${MOTION.ease}`,
                bgcolor: (theme) =>
                  active
                    ? theme.palette.mode === 'dark'
                      ? '#fff'
                      : 'primary.main'
                    : theme.palette.mode === 'dark'
                      ? 'rgba(186, 176, 204, 0.42)'
                      : 'action.disabled',
              }}
            />
          );
        })}
      </Stack>
      <Box
        sx={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <IconButton
          type="button"
          size="small"
          onClick={() => {
            setPlayBurst(true);
            toggleAutoplay();
          }}
          onAnimationEnd={() => setPlayBurst(false)}
          aria-label={autoplay ? pauseLabel : playLabel}
          aria-pressed={!autoplay}
          sx={{
            width: 32,
            height: 32,
            color: (theme) => (theme.palette.mode === 'dark' ? '#fff' : 'primary.main'),
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(20, 24, 48, 0.92)' : 'background.paper',
            border: (theme) => (theme.palette.mode === 'dark' ? 0 : '1px solid'),
            borderColor: 'divider',
            animation: playBurst ? `bannerPlayPop 320ms ${MOTION.ease}` : 'none',
            '@keyframes bannerPlayPop': {
              '0%': { transform: 'scale(0.82)', bgcolor: 'primary.main', color: 'primary.contrastText' },
              '55%': { transform: 'scale(1.12)', bgcolor: 'primary.main', color: 'primary.contrastText' },
              '100%': { transform: 'scale(1)' },
            },
            '&:hover': {
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(28, 34, 64, 1)' : 'background.level2',
            },
            '&:active': {
              transform: 'scale(0.92)',
            },
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
              '&:active': { transform: 'none' },
            },
          }}
        >
          {autoplay ? <PauseIcon size={14} weight="fill" /> : <PlayIcon size={14} weight="fill" />}
        </IconButton>
      </Box>
    </Box>
  );
}
