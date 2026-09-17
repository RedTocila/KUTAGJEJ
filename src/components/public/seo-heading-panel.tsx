'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Link as MuiLink, Stack, Typography } from '@mui/material';

import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { BannerSurface } from '@/components/public/banner-surface';

export function SeoEyebrow({ children = 'KuTaGjej' }: { children?: React.ReactNode }) {
  return (
    <Typography
      component="p"
      sx={{
        m: 0,
        display: 'inline-block',
        alignSelf: 'flex-start',
        px: 1.25,
        py: 0.5,
        borderRadius: 99,
        fontWeight: 700,
        fontSize: '0.72rem',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        bgcolor: 'var(--banner-eyebrow-bg, rgba(var(--mui-palette-primary-mainChannel) / 0.14))',
        color: 'primary.main',
        lineHeight: 1.2,
        border: 'none',
      }}
    >
      {children}
    </Typography>
  );
}

/**
 * SEO title/subtext card — same container language as the homepage community banner.
 */
export function SeoHeadingPanel({
  titleId,
  title,
  subtext,
  titleComponent = 'h1',
  eyebrow,
  maxWidth = '100%',
  dense = false,
  actions,
}: {
  titleId: string;
  title: string;
  subtext?: string;
  titleComponent?: 'h1' | 'h2' | 'h3';
  eyebrow?: React.ReactNode;
  maxWidth?: number | string;
  dense?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <BannerSurface dense={dense} sx={{ maxWidth, width: '100%' }}>
      <Stack spacing={dense ? 1.15 : 1.5} sx={{ maxWidth: 720 }}>
        {eyebrow === null ? null : eyebrow === undefined ? <SeoEyebrow /> : eyebrow}
        <Typography
          id={titleId}
          component={titleComponent}
          sx={{
            m: 0,
            fontWeight: 800,
            fontSize: dense
              ? { xs: '1.25rem', md: '1.55rem' }
              : titleComponent === 'h1'
                ? { xs: '1.45rem', sm: '1.75rem', md: '2.1rem' }
                : { xs: '1.35rem', md: '1.75rem' },
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            color: 'text.primary',
            textWrap: 'balance',
          }}
        >
          {title}
        </Typography>
        {subtext ? (
          <Typography
            component="p"
            sx={{
              m: 0,
              maxWidth: 640,
              fontSize: dense ? { xs: '0.94rem', md: '1.02rem' } : { xs: '0.95rem', md: '1.05rem' },
              lineHeight: 1.55,
              fontWeight: 500,
              color: 'text.secondary',
              textWrap: 'pretty',
            }}
          >
            {subtext}
          </Typography>
        ) : null}
        {actions}
      </Stack>
    </BannerSurface>
  );
}

export function SeoTextLinkRow({ links }: { links: ReadonlyArray<{ href: string; label: string }> }) {
  if (!links.length) return null;
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', pt: 0.35 }}>
      {links.map((link) => (
        <MuiLink
          key={link.href}
          component={RouterLink}
          href={link.href}
          underline="none"
          sx={{
            fontWeight: 700,
            fontSize: '0.84rem',
            px: 1.15,
            py: 0.55,
            borderRadius: 999,
            color: 'primary.dark',
            bgcolor: primaryMainAlpha(0.12),
            border: '1px solid',
            borderColor: primaryMainAlpha(0.18),
            transition: 'background-color 140ms ease, transform 140ms ease',
            '&:hover': {
              bgcolor: primaryMainAlpha(0.2),
              color: 'primary.dark',
            },
            '.dark &': {
              color: 'primary.light',
            },
            '&:active': { transform: 'scale(0.98)' },
          }}
        >
          {link.label}
        </MuiLink>
      ))}
    </Stack>
  );
}
