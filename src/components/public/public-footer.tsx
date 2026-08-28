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

const linkSx = {
  color: 'text.secondary',
  fontSize: '0.875rem',
  fontWeight: 500,
  lineHeight: 1.35,
  transition: 'color 0.15s',
  '&:hover': { color: 'primary.main' },
} as const;

export function PublicFooter() {
  const t = useCopy();

  const categoryLinks = [
    { label: t.verticals.ai.label, href: `${paths.public.search}?cat=ai` },
    { label: t.verticals['real-estate'].label, href: paths.public.realEstate },
    { label: t.verticals.cars.label, href: paths.public.cars },
    { label: t.verticals.jobs.label, href: paths.public.jobs },
    { label: t.verticals.marketplace.label, href: paths.public.marketplace },
    { label: t.verticals.okazion.label, href: paths.public.okazion },
    { label: t.verticals.businesses.label, href: paths.public.businesses },
    { label: t.verticals.professionals.label, href: paths.public.professionals },
  ];

  const userLinks = [
    { label: t.chrome.footerPostFree, href: paths.user.realEstateListing },
    { label: t.common.loginRegister, href: paths.user.auth },
    { label: t.common.myPanel, href: paths.user.dashboard },
    { label: t.chrome.footerMyListings, href: paths.user.myRealEstateListings },
  ];

  const aboutLinks = [
    { label: t.chrome.footerAboutUs, href: paths.public.about },
    { label: t.chrome.footerContact, href: paths.public.contact },
    { label: t.chrome.footerTerms, href: paths.public.terms },
    { label: t.chrome.footerPrivacy, href: paths.public.privacy },
  ];

  return (
    <Box
      component="footer"
      sx={{
        mt: { xs: 5, md: 10 },
        pt: { xs: 3.5, md: 6 },
        pb: { xs: 2.5, md: 3 },
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
        sx={(theme) => ({
          position: 'absolute',
          inset: 0,
          background: 'none',
          pointerEvents: 'none',
          ...theme.applyStyles('dark', {
            background: `radial-gradient(circle at 0% 0%, ${primaryMainAlpha(0.08)}, transparent 45%), radial-gradient(circle at 100% 100%, ${secondaryMainAlpha(
              0.06,
            )}, transparent 45%)`,
          }),
        })}
      />
      <Container maxWidth="xl" sx={{ position: 'relative' }}>
        <Stack spacing={{ xs: 2.75, md: 4 }}>
          {/* Brand + contact — compact row on mobile */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 1.75, sm: 3 }}
            sx={{ alignItems: { sm: 'flex-start' }, justifyContent: 'space-between' }}
          >
            <Stack spacing={1} sx={{ maxWidth: 380, minWidth: 0, flex: 1 }}>
              <RouterLink href={paths.home} style={{ textDecoration: 'none', color: 'inherit', alignSelf: 'flex-start' }}>
                <BrandLogo
                  height={28}
                  showWordmark
                  wordmarkPresentation="brand"
                  markSx={{
                    borderRadius: 1.75,
                    p: 0.6,
                    bgcolor: (theme) =>
                      primaryMainAlpha(theme.palette.mode === 'dark' ? 0.18 : 0.12),
                  }}
                  wordmarkSx={{ fontSize: '1.15rem' }}
                />
              </RouterLink>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ lineHeight: 1.55, fontSize: { xs: '0.82rem', md: '0.875rem' } }}
              >
                {t.chrome.footerBlurb}
              </Typography>
            </Stack>

            <Stack
              direction="row"
              spacing={{ xs: 1.5, sm: 2 }}
              sx={{
                flexWrap: 'wrap',
                alignItems: 'center',
                rowGap: 1,
                flexShrink: 0,
              }}
            >
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                <Box sx={{ color: 'primary.main', display: 'inline-flex' }}>
                  {React.createElement(EnvelopeIcon, { size: 16, weight: 'duotone' })}
                </Box>
                <Link
                  href="mailto:hello@kutagjej.al"
                  underline="hover"
                  sx={{ color: 'text.primary', fontWeight: 500, fontSize: '0.82rem' }}
                >
                  hello@kutagjej.al
                </Link>
              </Stack>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                <Box sx={{ color: 'primary.main', display: 'inline-flex' }}>
                  {React.createElement(MapPinIcon, { size: 16, weight: 'duotone' })}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                  {t.chrome.footerLocation}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5}>
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
                      width: 32,
                      height: 32,
                      '&:hover': {
                        color: 'primary.main',
                        bgcolor: primaryMainAlpha(0.12),
                      },
                    }}
                  >
                    {React.createElement(Icon, { size: 16, weight: 'fill' })}
                  </IconButton>
                ))}
              </Stack>
            </Stack>
          </Stack>

          {/* Categories — multi-column link grid */}
          <Box>
            <Typography
              variant="overline"
              sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '0.08em', display: 'block', mb: 1 }}
            >
              {t.chrome.footerCategories}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  sm: 'repeat(3, minmax(0, 1fr))',
                  md: 'repeat(4, minmax(0, 1fr))',
                },
                columnGap: { xs: 1.5, sm: 2.5 },
                rowGap: { xs: 0.85, sm: 1 },
              }}
            >
              {categoryLinks.map((link) => (
                <Link
                  key={link.href}
                  component={RouterLink}
                  href={link.href}
                  underline="none"
                  sx={linkSx}
                >
                  {link.label}
                </Link>
              ))}
            </Box>
          </Box>

          {/* Users + About side by side */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(2, minmax(0, 220px))' },
              columnGap: { xs: 2, sm: 4 },
              rowGap: 2,
              justifyContent: { md: 'flex-start' },
            }}
          >
            {(
              [
                { title: t.chrome.footerUsers, links: userLinks },
                { title: t.chrome.footerAbout, links: aboutLinks },
              ] as const
            ).map((col) => (
              <Stack key={col.title} spacing={1}>
                <Typography
                  variant="overline"
                  sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '0.08em' }}
                >
                  {col.title}
                </Typography>
                <Stack spacing={0.75}>
                  {col.links.map((link) => (
                    <Link
                      key={link.href}
                      component={RouterLink}
                      href={link.href}
                      underline="none"
                      sx={linkSx}
                    >
                      {link.label}
                    </Link>
                  ))}
                </Stack>
              </Stack>
            ))}
          </Box>
        </Stack>

        <Divider sx={{ my: { xs: 2.5, md: 3.5 } }} />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
            © {new Date().getFullYear()} {config.site.name} — Ku Ta Gjej. {t.chrome.footerRights}
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Link
              component={RouterLink}
              href={paths.public.terms}
              underline="hover"
              sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
            >
              {t.chrome.footerTermsShort}
            </Link>
            <Link
              component={RouterLink}
              href={paths.public.privacy}
              underline="hover"
              sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
            >
              {t.chrome.footerPrivacyShort}
            </Link>
            <Link
              component={RouterLink}
              href={paths.public.contact}
              underline="hover"
              sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
            >
              {t.chrome.footerContact}
            </Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
