'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { alpha, Box, Container, Divider, IconButton, Link, Stack, Typography } from '@mui/material';
import { FacebookLogo as FacebookIcon } from '@phosphor-icons/react/dist/ssr/FacebookLogo';
import { InstagramLogo as InstagramIcon } from '@phosphor-icons/react/dist/ssr/InstagramLogo';
import { LinkedinLogo as LinkedinIcon } from '@phosphor-icons/react/dist/ssr/LinkedinLogo';
import { Envelope as EnvelopeIcon } from '@phosphor-icons/react/dist/ssr/Envelope';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';

import { BrandLogo } from '@/components/brand/brand-logo';
import { config } from '@/config';
import { paths } from '@/paths';

const COLUMNS = [
  {
    title: 'Kategoritë',
    links: [
      { label: 'Pasuri të paluajtshme', href: paths.public.realEstate },
      { label: 'Automjete', href: paths.public.cars },
      { label: 'Punë', href: paths.public.jobs },
      { label: 'Tregu', href: paths.public.marketplace },
    ],
  },
  {
    title: 'Përdoruesit',
    links: [
      { label: 'Posto njoftim falas', href: paths.user.realEstateListing },
      { label: 'Hyr / Regjistrohu', href: paths.user.auth },
      { label: 'Paneli im', href: paths.user.dashboard },
      { label: 'Shpalljet e mia', href: paths.user.myRealEstateListings },
    ],
  },
  {
    title: 'Rreth platformës',
    links: [
      { label: 'Rreth nesh', href: paths.public.about },
      { label: 'Kontakti', href: paths.public.contact },
      { label: 'Kushtet e përdorimit', href: paths.public.terms },
      { label: 'Politika e privatësisë', href: paths.public.privacy },
    ],
  },
] as const;

const SOCIAL = [
  { label: 'Facebook', href: 'https://facebook.com', icon: FacebookIcon },
  { label: 'Instagram', href: 'https://instagram.com', icon: InstagramIcon },
  { label: 'LinkedIn', href: 'https://linkedin.com', icon: LinkedinIcon },
] as const;

export function PublicFooter() {
  return (
    <Box
      component="footer"
      sx={{
        mt: { xs: 8, md: 12 },
        pt: { xs: 6, md: 8 },
        pb: 3,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark'
            ? 'var(--mui-palette-background-paper)'
            : alpha(theme.palette.primary.main, 0.04),
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: (theme) =>
            `radial-gradient(circle at 0% 0%, ${alpha(theme.palette.primary.main, 0.08)}, transparent 45%), radial-gradient(circle at 100% 100%, ${alpha(
              theme.palette.secondary.main,
              0.06,
            )}, transparent 45%)`,
          pointerEvents: 'none',
        }}
      />
      <Container maxWidth="xl" sx={{ position: 'relative' }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 4, md: 6 }}
          sx={{ alignItems: { md: 'flex-start' }, justifyContent: 'space-between' }}
        >
          <Stack spacing={2} sx={{ maxWidth: 360 }}>
            <RouterLink href={paths.home} style={{ textDecoration: 'none', color: 'inherit', alignSelf: 'flex-start' }}>
              <BrandLogo
                height={42}
                showWordmark
                wordmarkPresentation="brand"
                markSx={{
                  borderRadius: 2,
                  p: 0.75,
                  bgcolor: (theme) =>
                    alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.12),
                }}
                wordmarkSx={{ fontSize: '1.25rem' }}
              />
            </RouterLink>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              {config.site.description} Posto, kërko dhe gjej shpejt — pasuri, automjete, punë dhe shumë më tepër, në një vend.
            </Typography>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Box sx={{ color: 'primary.main', display: 'inline-flex' }}>
                  {React.createElement(EnvelopeIcon, { size: 18, weight: 'duotone' })}
                </Box>
                <Link
                  href="mailto:hello@kutagjej.al"
                  underline="hover"
                  sx={{ color: 'text.primary', fontWeight: 500 }}
                >
                  hello@kutagjej.al
                </Link>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Box sx={{ color: 'primary.main', display: 'inline-flex' }}>
                  {React.createElement(MapPinIcon, { size: 18, weight: 'duotone' })}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Tiranë, Shqipëri
                </Typography>
              </Stack>
            </Stack>
            <Stack direction="row" spacing={0.75} sx={{ pt: 0.5 }}>
              {SOCIAL.map(({ label, href, icon: Icon }) => (
                <IconButton
                  key={label}
                  component="a"
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  size="small"
                  sx={{
                    color: 'text.secondary',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                    '&:hover': {
                      color: 'primary.main',
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                    },
                  }}
                >
                  {React.createElement(Icon, { size: 18, weight: 'fill' })}
                </IconButton>
              ))}
            </Stack>
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 3, sm: 6 }}
            sx={{ flex: 1, justifyContent: { md: 'flex-end' } }}
          >
            {COLUMNS.map((col) => (
              <Stack key={col.title} spacing={1.25} sx={{ minWidth: 160 }}>
                <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '0.08em' }}>
                  {col.title}
                </Typography>
                <Stack spacing={1}>
                  {col.links.map((link) => (
                    <Link
                      key={link.href}
                      component={RouterLink}
                      href={link.href}
                      underline="none"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        transition: 'color 0.15s',
                        '&:hover': { color: 'primary.main' },
                      }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Stack>

        <Divider sx={{ my: { xs: 4, md: 5 } }} />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} {config.site.name} — Ku Ta Gjej. Të gjitha të drejtat e rezervuara.
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Link
              component={RouterLink}
              href={paths.public.terms}
              underline="hover"
              sx={{ color: 'text.secondary', fontSize: '0.85rem' }}
            >
              Kushtet
            </Link>
            <Link
              component={RouterLink}
              href={paths.public.privacy}
              underline="hover"
              sx={{ color: 'text.secondary', fontSize: '0.85rem' }}
            >
              Privatësia
            </Link>
            <Link
              component={RouterLink}
              href={paths.public.contact}
              underline="hover"
              sx={{ color: 'text.secondary', fontSize: '0.85rem' }}
            >
              Kontakti
            </Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
