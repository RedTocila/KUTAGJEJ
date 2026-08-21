'use client';

import * as React from 'react';
import { Box, Typography, type BoxProps } from '@mui/material';

import { BrandLogo } from '@/components/brand/brand-logo';
import { brandLogoSrc, config } from '@/config';
import { brandWordmarkFontFamily } from '@/styles/brand-font';

const wordmark = config.site.wordmarkSegments ?? (['KuTa', 'Gjej'] as const);

/**
 * Default member-profile banner: brand gradient, logo mark, and wordmark.
 */
export function BrandCover({ children, sx, ...rest }: BoxProps) {
  return (
    <Box
      {...rest}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate',
        backgroundColor: '#0a1407',
        backgroundImage: [
          'radial-gradient(80% 70% at 82% 0%, rgba(110, 170, 40, 0.22) 0%, transparent 58%)',
          'radial-gradient(70% 90% at 8% 100%, rgba(4, 10, 2, 0.7) 0%, transparent 58%)',
          'linear-gradient(128deg, #070f05 0%, #0f1e09 40%, #1a3510 74%, #2a5214 100%)',
        ].join(', '),
        ...sx,
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 42%)',
        }}
      />
      <Box
        aria-hidden
        component="img"
        alt=""
        src={brandLogoSrc}
        sx={{
          display: { xs: 'none', sm: 'block' },
          position: 'absolute',
          right: { sm: -36, md: -20 },
          bottom: { sm: -48, md: -56 },
          width: { sm: 200, md: 240 },
          height: 'auto',
          opacity: 0.1,
          pointerEvents: 'none',
          userSelect: 'none',
          filter: 'brightness(2.6)',
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pb: { xs: 0.5, sm: 0.75 },
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0,
            opacity: 0.48,
          }}
        >
          <BrandLogo
            height={96}
            imgSx={{
              height: { xs: 84, sm: 108 },
              width: 'auto',
              mr: { xs: -1.75, sm: -2.5 },
            }}
          />
          <Typography
            component="span"
            sx={{
              fontFamily: brandWordmarkFontFamily,
              letterSpacing: '-0.055em',
              display: 'inline-flex',
              alignItems: 'baseline',
              columnGap: 0.25,
              lineHeight: 1,
              WebkitFontSmoothing: 'antialiased',
            }}
          >
            <Box
              component="span"
              sx={{
                color: 'rgba(196, 220, 150, 0.95)',
                fontWeight: 600,
                fontSize: { xs: '2.55rem', sm: '3.4rem' },
              }}
            >
              {wordmark[0]}
            </Box>
            <Box
              component="span"
              sx={{
                color: '#e8ff86',
                fontWeight: 800,
                fontSize: { xs: '2.55rem', sm: '3.4rem' },
              }}
            >
              {wordmark[1]}
            </Box>
          </Typography>
        </Box>
      </Box>

      {children}
    </Box>
  );
}
