'use client';

import { Box, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

/** Single-line looping marquee for compact listing card rows. */
export function CardTextMarquee({
  text,
  animationName = 'cardTextMarquee',
  durationSec = 26,
  textSx,
}: {
  text: string;
  animationName?: string;
  durationSec?: number;
  textSx?: SxProps<Theme>;
}) {
  const segment = `${text} · `;

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        maskImage: 'linear-gradient(90deg, transparent 0%, #000 4%, #000 96%, transparent 100%)',
      }}
    >
      <Box
        aria-hidden
        sx={{
          display: 'flex',
          width: 'max-content',
          animation: `${animationName} ${durationSec}s linear infinite`,
          [`@keyframes ${animationName}`]: {
            '0%': { transform: 'translateX(0)' },
            '100%': { transform: 'translateX(-50%)' },
          },
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
          },
        }}
      >
        {[0, 1].map((key) => (
          <Typography
            key={key}
            component="span"
            sx={{
              flexShrink: 0,
              whiteSpace: 'nowrap',
              pr: 3,
              lineHeight: 1.35,
              ...textSx,
            }}
          >
            {segment}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}
