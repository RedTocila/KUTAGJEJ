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
  Divider,
  Drawer,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useScrollTrigger,
} from '@mui/material';
import { List as ListIcon } from '@phosphor-icons/react/dist/ssr/List';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { SignIn as SignInIcon } from '@phosphor-icons/react/dist/ssr/SignIn';
import { UserCircle as UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';
import { X as CloseIcon } from '@phosphor-icons/react/dist/ssr/X';

import { BrandLogo } from '@/components/brand/brand-logo';
import { ThemeModeToggle } from '@/components/dashboard/layout/theme-mode-toggle';
import { useUser } from '@/hooks/use-user';
import type { HomeVerticalId } from '@/lib/home-categories';
import { paths } from '@/paths';

import { VerticalIcon } from './vertical-icon';

const NAV_ITEMS: ReadonlyArray<{ label: string; href: string; verticalId: HomeVerticalId }> = [
  { label: 'Pasuri', href: paths.public.realEstate, verticalId: 'real-estate' },
  { label: 'Automjete', href: paths.public.cars, verticalId: 'cars' },
  { label: 'Punë', href: paths.public.jobs, verticalId: 'jobs' },
  { label: 'Tregu', href: paths.public.marketplace, verticalId: 'marketplace' },
] as const;

export function PublicHeader() {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const pathname = usePathname();
  const { user } = useUser();
  const elevated = useScrollTrigger({ disableHysteresis: true, threshold: 8 });

  const dashboardHref =
    user?.accountType === 'admin' ? paths.dashboard.overview : paths.user.dashboard;
  const postHref = paths.user.realEstateListing;

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        component="header"
        sx={{
          color: 'text.primary',
          backgroundColor: (theme) =>
            elevated
              ? `rgb(var(--mui-palette-background-paperChannel) / ${theme.palette.mode === 'dark' ? 0.92 : 0.96})`
              : `rgb(var(--mui-palette-background-paperChannel) / ${theme.palette.mode === 'dark' ? 0.7 : 0.85})`,
          backdropFilter: 'saturate(180%) blur(14px)',
          WebkitBackdropFilter: 'saturate(180%) blur(14px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
          zIndex: (theme) => theme.zIndex.appBar,
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 76 }, gap: 2 }}>
            <Box
              component={RouterLink}
              href={paths.home}
              aria-label="KuTaGjej — kreu"
              sx={{ display: 'inline-flex', textDecoration: 'none', color: 'inherit', flexShrink: 0 }}
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
                    startIcon={<VerticalIcon verticalId={item.verticalId} size={20} decorative />}
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
              sx={{ alignItems: 'center', display: { xs: 'flex', md: 'none' }, ml: 'auto' }}
            >
              <ThemeModeToggle />
              <IconButton
                aria-label="Hap menynë"
                onClick={() => setDrawerOpen(true)}
                sx={{ color: 'text.primary' }}
              >
                {React.createElement(ListIcon, { size: 26 })}
              </IconButton>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: 320, p: 2 } } }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <BrandLogo height={32} showWordmark wordmarkPresentation="brand" />
          <IconButton onClick={() => setDrawerOpen(false)} aria-label="Mbyll menynë">
            {React.createElement(CloseIcon, { size: 22 })}
          </IconButton>
        </Stack>
        <Divider sx={{ mb: 1.5 }} />
        <Stack spacing={0.5}>
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.href}
              component={RouterLink}
              href={item.href}
              onClick={() => setDrawerOpen(false)}
              startIcon={<VerticalIcon verticalId={item.verticalId} size={22} decorative />}
              sx={{
                justifyContent: 'flex-start',
                px: 1.5,
                py: 1.25,
                borderRadius: 2,
                color: 'text.primary',
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '1rem',
              }}
            >
              {item.label}
            </Button>
          ))}
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Stack spacing={1}>
          {user ? (
            <>
              <Button
                component={RouterLink}
                href={dashboardHref}
                onClick={() => setDrawerOpen(false)}
                variant="outlined"
                startIcon={React.createElement(UserCircleIcon, { size: 20 })}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Paneli im
              </Button>
              <Button
                component={RouterLink}
                href={postHref}
                onClick={() => setDrawerOpen(false)}
                variant="contained"
                startIcon={React.createElement(PlusIcon, { size: 20, weight: 'bold' })}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
              >
                Posto njoftim
              </Button>
            </>
          ) : (
            <>
              <Button
                component={RouterLink}
                href={paths.user.auth}
                onClick={() => setDrawerOpen(false)}
                variant="outlined"
                startIcon={React.createElement(SignInIcon, { size: 20 })}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Hyr / Regjistrohu
              </Button>
              <Button
                component={RouterLink}
                href={paths.user.realEstateListing}
                onClick={() => setDrawerOpen(false)}
                variant="contained"
                startIcon={React.createElement(PlusIcon, { size: 20, weight: 'bold' })}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
              >
                Posto njoftim falas
              </Button>
            </>
          )}
        </Stack>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', mt: 3 }}>
          © {new Date().getFullYear()} KuTaGjej
        </Typography>
      </Drawer>
    </>
  );
}
