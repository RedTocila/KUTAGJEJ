'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Container, Divider, IconButton, Link, Stack, Typography } from '@mui/material';
import { FacebookLogo as FacebookIcon } from '@phosphor-icons/react/dist/ssr/FacebookLogo';
import { InstagramLogo as InstagramIcon } from '@phosphor-icons/react/dist/ssr/InstagramLogo';
import { LinkedinLogo as LinkedinIcon } from '@phosphor-icons/react/dist/ssr/LinkedinLogo';
import { Envelope as EnvelopeIcon } from '@phosphor-icons/react/dist/ssr/Envelope';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';

import { BrandLogo } from '@/components/brand/brand-logo';
import { config } from '@/config';
import { useCopy } from '@/hooks/use-copy';
import { primaryMainAlpha, secondaryMainAlpha } from '@/lib/css-var-alpha';
import { paths } from '@/paths';

const SOCIAL = [
  { label: 'Facebook', href: 'https://facebook.com', icon: FacebookIcon },
  { label: 'Instagram', href: 'https://instagram.com', icon: InstagramIcon },
  { label: 'LinkedIn', href: 'https://linkedin.com', icon: LinkedinIcon },
] as const;

export function PublicFooter() {
  const t = useCopy();

  const columns = [
    {
      title: t.chrome.footerCategories,
      links: [
        { label: t.verticals.ai.label, href: `${paths.public.search}?cat=ai` },
        { label: t.verticals['real-estate'].label, href: paths.public.realEstate },
        { label: t.verticals.cars.label, href: paths.public.cars },
        { label: t.verticals.jobs.label, href: paths.public.jobs },
        { label: t.verticals.marketplace.label, href: paths.public.marketplace },
        { label: t.verticals.okazion.label, href: paths.public.okazion },
        { label: t.verticals.businesses.label, href: paths.public.businesses },
        { label: t.verticals.professionals.label, href: paths.public.professionals },
      ],
    },
    {
      title: t.chrome.footerUsers,
      links: [
        { label: t.chrome.footerPostFree, href: paths.user.realEstateListing },
        { label: t.common.loginRegister, href: paths.user.auth },
        { label: t.common.myPanel, href: paths.user.dashboard },
        { label: t.chrome.footerMyListings, href: paths.user.myRealEstateListings },
      ],
    },
    {
      title: t.chrome.footerAbout,
      links: [
        { label: t.chrome.footerAboutUs, href: paths.public.about },
        { label: t.chrome.footerContact, href: paths.public.contact },
        { label: t.chrome.footerTerms, href: paths.public.terms },
        { label: t.chrome.footerPrivacy, href: paths.public.privacy },
      ],
    },
  ];

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
            : primaryMainAlpha(0.04),
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 0% 0%, ${primaryMainAlpha(0.08)}, transparent 45%), radial-gradient(circle at 100% 100%, ${secondaryMainAlpha(
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
                height={32}
                showWordmark
                wordmarkPresentation="brand"
                markSx={{
                  borderRadius: 2,
                  p: 0.75,
                  bgcolor: (theme) =>
                    primaryMainAlpha(theme.palette.mode === 'dark' ? 0.18 : 0.12),
                }}
                wordmarkSx={{ fontSize: '1.25rem' }}
              />
            </RouterLink>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              {t.chrome.footerBlurb}
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
                  {t.chrome.footerLocation}
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
                    bgcolor: primaryMainAlpha(0.06),
                    '&:hover': {
                      color: 'primary.main',
                      bgcolor: primaryMainAlpha(0.12),
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
            {columns.map((col) => (
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
            © {new Date().getFullYear()} {config.site.name} — Ku Ta Gjej. {t.chrome.footerRights}
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Link
              component={RouterLink}
              href={paths.public.terms}
              underline="hover"
              sx={{ color: 'text.secondary', fontSize: '0.85rem' }}
            >
              {t.chrome.footerTermsShort}
            </Link>
            <Link
              component={RouterLink}
              href={paths.public.privacy}
              underline="hover"
              sx={{ color: 'text.secondary', fontSize: '0.85rem' }}
            >
              {t.chrome.footerPrivacyShort}
            </Link>
            <Link
              component={RouterLink}
              href={paths.public.contact}
              underline="hover"
              sx={{ color: 'text.secondary', fontSize: '0.85rem' }}
            >
              {t.chrome.footerContact}
            </Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
