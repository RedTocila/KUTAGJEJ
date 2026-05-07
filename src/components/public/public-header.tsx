'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import {
  alpha,
  AppBar,
  Box,
  Button,
  Container,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  useScrollTrigger,
} from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { SignIn as SignInIcon } from '@phosphor-icons/react/dist/ssr/SignIn';
import { UserCircle as UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';

import { BrandLogo } from '@/components/brand/brand-logo';
import { ThemeModeToggle } from '@/components/dashboard/layout/theme-mode-toggle';
import { useUser } from '@/hooks/use-user';
import type { HomeVerticalId } from '@/lib/home-categories';
import { paths } from '@/paths';

import { VerticalIcon } from './vertical-icon';

const TOOLBAR_MIN_HEIGHT = { xs: 64, md: 76 } as const;

/**
 * Hides the header while scrolling down, shows it when scrolling up (or when
 * near the top of the page). Uses a small delta threshold to ignore tiny jitters.
 */
function useHeaderScrollHidden() {
  const [hidden, setHidden] = React.useState(false);
  const lastY = React.useRef(0);

  React.useEffect(() => {
    const deltaThreshold = 6;
    const alwaysShowBelowY = 56;

    const onScroll = () => {
      const y = window.scrollY;
      const prev = lastY.current;
      const delta = y - prev;
      lastY.current = y;

      if (y <= alwaysShowBelowY) {
        setHidden(false);
        return;
      }
      if (delta > deltaThreshold) {
        setHidden(true);
      } else if (delta < -deltaThreshold) {
        setHidden(false);
      }
    };

    lastY.current = window.scrollY;
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return hidden;
}

const NAV_ITEMS: ReadonlyArray<{ label: string; href: string; verticalId: HomeVerticalId }> = [
  { label: 'Pasuri', href: paths.public.realEstate, verticalId: 'real-estate' },
  { label: 'Makina', href: paths.public.cars, verticalId: 'cars' },
  { label: 'Punë', href: paths.public.jobs, verticalId: 'jobs' },
  { label: 'Tregu', href: paths.public.marketplace, verticalId: 'marketplace' },
  { label: 'Biznese', href: paths.public.businesses, verticalId: 'businesses' },
  { label: 'Profesionistë', href: paths.public.professionals, verticalId: 'professionals' },
] as const;

export function PublicHeader() {
  const pathname = usePathname();
  const { user } = useUser();
  const elevated = useScrollTrigger({ disableHysteresis: true, threshold: 8 });
  const headerHidden = useHeaderScrollHidden();

  const dashboardHref =
    user?.accountType === 'admin' ? paths.dashboard.overview : paths.user.dashboard;
  const postHref = paths.user.realEstateListing;
  const mobilePostHref = user ? postHref : paths.user.auth;

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        component="header"
        sx={{
          top: 0,
          left: 0,
          right: 0,
          color: 'text.primary',
          backgroundColor: (theme) =>
            elevated
              ? `rgb(var(--mui-palette-background-paperChannel) / ${theme.palette.mode === 'dark' ? 0.92 : 0.96})`
              : `rgb(var(--mui-palette-background-paperChannel) / ${theme.palette.mode === 'dark' ? 0.7 : 0.85})`,
          backdropFilter: 'saturate(180%) blur(14px)',
          WebkitBackdropFilter: 'saturate(180%) blur(14px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          transform: headerHidden ? 'translateY(-100%)' : 'translateY(0)',
          transition: (theme) =>
            theme.transitions.create(['transform', 'background-color', 'border-color'], {
              duration: 220,
              easing: theme.transitions.easing.easeInOut,
            }),
          zIndex: (theme) => theme.zIndex.appBar,
          willChange: 'transform',
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'background-color 0.2s ease, border-color 0.2s ease',
          },
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 76 }, gap: 2 }}>
            <Stack
              direction="row"
              sx={{ alignItems: 'center', display: { xs: 'flex', md: 'none' }, width: 44, flexShrink: 0 }}
            >
              <Tooltip title="Posto njoftim">
                <IconButton
                  component={RouterLink}
                  href={mobilePostHref}
                  aria-label="Posto njoftim"
                  sx={{ color: 'text.primary' }}
                >
                  {React.createElement(PlusIcon, { size: 24, weight: 'bold' })}
                </IconButton>
              </Tooltip>
            </Stack>

            <Box
              component={RouterLink}
              href={paths.home}
              aria-label="KuTaGjej — kreu"
              sx={{
                display: 'inline-flex',
                textDecoration: 'none',
                color: 'inherit',
                flexShrink: 0,
                mx: { xs: 'auto', md: 0 },
              }}
            >
              <BrandLogo
                height={40}
                showWordmark
                wordmarkPresentation="brand"
                markSx={{
                  borderRadius: 2,
                  p: 0.75,
                  bgcolor: (theme) =>
                    alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.1),
                }}
                wordmarkSx={{ fontSize: { xs: '1.05rem', md: '1.2rem' } }}
              />
            </Box>

            <Stack
              direction="row"
              spacing={0.5}
              sx={{
                display: { xs: 'none', md: 'flex' },
                ml: 2,
                flex: 1,
              }}
            >
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <Button
                    key={item.href}
                    component={RouterLink}
                    href={item.href}
                    startIcon={<VerticalIcon verticalId={item.verticalId} size={30} decorative />}
                    sx={{
                      px: 1.75,
                      py: 1,
                      borderRadius: 2,
                      color: active ? 'primary.main' : 'text.secondary',
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '0.95rem',
                      '&:hover': {
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                        color: 'primary.main',
                      },
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', display: { xs: 'none', md: 'flex' }, flexShrink: 0 }}
            >
              <ThemeModeToggle />
              {user ? (
                <>
                  <Tooltip title="Shko në panelin tim">
                    <IconButton
                      component={RouterLink}
                      href={dashboardHref}
                      sx={{ color: 'text.secondary' }}
                    >
                      {React.createElement(UserCircleIcon, { size: 24 })}
                    </IconButton>
                  </Tooltip>
                  <Button
                    component={RouterLink}
                    href={postHref}
                    variant="contained"
                    startIcon={React.createElement(PlusIcon, { size: 18, weight: 'bold' })}
                    sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 2 }}
                  >
                    Posto njoftim
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    component={RouterLink}
                    href={paths.user.auth}
                    sx={{
                      borderRadius: 2,
                      color: 'text.primary',
                      fontWeight: 600,
                      textTransform: 'none',
                      px: 2,
                    }}
                    startIcon={React.createElement(SignInIcon, { size: 18 })}
                  >
                    Hyr
                  </Button>
                  <Button
                    component={RouterLink}
                    href={paths.user.realEstateListing}
                    variant="contained"
                    startIcon={React.createElement(PlusIcon, { size: 18, weight: 'bold' })}
                    sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 2 }}
                  >
                    Posto falas
                  </Button>
                </>
              )}
            </Stack>

            <Stack
              direction="row"
              spacing={0.5}
              sx={{
                alignItems: 'center',
                display: { xs: 'flex', md: 'none' },
                width: 44,
                justifyContent: 'flex-end',
                flexShrink: 0,
              }}
            >
              <ThemeModeToggle />
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>
      {/* Keeps document flow under `position: fixed` so content is not covered */}
      <Toolbar
        disableGutters
        aria-hidden
        sx={{
          minHeight: TOOLBAR_MIN_HEIGHT,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}
