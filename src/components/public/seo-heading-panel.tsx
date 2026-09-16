'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Link as MuiLink, Stack, Typography } from '@mui/material';

import { primaryMainAlpha } from '@/lib/css-var-alpha';

const panelShellSx = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: { xs: 2.5, md: 3 },
  px: { xs: 2, md: 2.75 },
  py: { xs: 2, md: 2.5 },
  background: `
    linear-gradient(135deg, ${primaryMainAlpha(0.12)} 0%, ${primaryMainAlpha(0.04)} 42%, transparent 72%),
    linear-gradient(180deg, rgba(var(--mui-palette-background-paperChannel) / 0.92) 0%, rgba(var(--mui-palette-background-paperChannel) / 0.72) 100%)
  `,
  boxShadow: `
    inset 0 0 0 1px ${primaryMainAlpha(0.14)},
    0 1px 2px rgba(15, 23, 10, 0.04)
  `,
  '.dark &': {
    background: `
      linear-gradient(135deg, ${primaryMainAlpha(0.18)} 0%, ${primaryMainAlpha(0.06)} 45%, transparent 75%),
      linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)
    `,
    boxShadow: `
      inset 0 0 0 1px ${primaryMainAlpha(0.22)},
      0 1px 2px rgba(0,0,0,0.25)
    `,
  },
} as const;

const accentBarSx = {
  position: 'absolute',
  left: 0,
  top: 14,
  bottom: 14,
  width: 3.5,
  borderRadius: '0 4px 4px 0',
  background: 'linear-gradient(180deg, var(--mui-palette-primary-light) 0%, var(--mui-palette-primary-main) 55%, var(--mui-palette-primary-dark) 100%)',
  boxShadow: `0 0 12px ${primaryMainAlpha(0.35)}`,
} as const;

export function SeoEyebrow({ children = 'KuTaGjej' }: { children?: React.ReactNode }) {
  return (
    <Typography
      component="p"
      sx={{
        m: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        fontWeight: 800,
        fontSize: '0.72rem',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'primary.main',
        lineHeight: 1,
      }}
    >
      <Box
        component="span"
        aria-hidden
        sx={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          boxShadow: `0 0 0 3px ${primaryMainAlpha(0.22)}`,
        }}
      />
      {children}
    </Typography>
  );
}

/**
 * Shared visual shell for browser SEO titles/subtexts — soft brand wash + accent bar.
 * Keeps H1/H2 semantics for crawlers while matching KuTaGjej UI.
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
    <Box sx={{ ...panelShellSx, width: '100%', maxWidth, py: dense ? { xs: 1.6, md: 2 } : panelShellSx.py }}>
      <Box aria-hidden sx={accentBarSx} />
      <Stack spacing={dense ? 0.85 : 1.15} sx={{ pl: { xs: 1.15, md: 1.35 } }}>
        {eyebrow === null ? null : eyebrow === undefined ? <SeoEyebrow /> : eyebrow}
        <Typography
          id={titleId}
          component={titleComponent}
          sx={{
            m: 0,
            fontWeight: 800,
            fontSize: dense
              ? { xs: '1.2rem', md: '1.4rem' }
              : titleComponent === 'h1'
                ? { xs: '1.4rem', sm: '1.65rem', md: '1.95rem' }
                : { xs: '1.25rem', md: '1.5rem' },
            lineHeight: 1.18,
            letterSpacing: '-0.03em',
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
              maxWidth: '100%',
              fontSize: dense ? { xs: '0.92rem', md: '0.98rem' } : { xs: '0.95rem', md: '1.05rem' },
              lineHeight: 1.6,
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
    </Box>
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
