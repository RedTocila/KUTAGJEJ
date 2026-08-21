'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
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
import { AddListingPickerDialog } from '@/components/user/add-listing-picker-dialog';
import { useCopy } from '@/hooks/use-copy';
import { useScrollRevealHidden } from '@/hooks/use-scroll-reveal-hidden';
import { useUser } from '@/hooks/use-user';
import { hardNavigate } from '@/lib/hard-navigate';
import { paths } from '@/paths';

import { HeaderMobileSearch } from './header-mobile-search';
import { useMainTabs } from '@/components/main-tabs/main-tabs-shell';

const TOOLBAR_MIN_HEIGHT = { xs: 72, md: 88 } as const;

export function PublicHeader() {
  const { user } = useUser();
  const t = useCopy();
  const { hosted, scrollParent } = useMainTabs();
  const elevated = useScrollTrigger({
    disableHysteresis: true,
    threshold: 8,
    target: scrollParent ?? undefined,
  });
  const headerHidden = useScrollRevealHidden({ target: scrollParent });
  // Main tabs (including an open chat): header stays in document flow.
  // Other public routes keep a fixed bar that hides on scroll-down.
  const pinToViewport = !hosted;
  const [mounted, setMounted] = React.useState(false);
  const [addListingOpen, setAddListingOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const accountHref =
    user?.accountType === 'admin' ? paths.dashboard.overview : paths.user.dashboard;
  const openPostPicker = () => {
    if (user) {
      setAddListingOpen(true);
      return;
    }
    hardNavigate(paths.user.auth);
  };

  return (
    <>
      <AppBar
        position={pinToViewport ? 'fixed' : 'relative'}
        elevation={0}
        component="header"
        suppressHydrationWarning
        sx={(theme) => {
          const paperAlpha = theme.palette.mode === 'dark' ? 0.92 : 0.96;
          const paperAlphaRest = theme.palette.mode === 'dark' ? 0.7 : 0.85;
          const frosted = `rgb(var(--mui-palette-background-paperChannel) / ${paperAlpha})`;
          const frostedRest = `rgb(var(--mui-palette-background-paperChannel) / ${paperAlphaRest})`;
          const blur = 'saturate(180%) blur(14px)';
          const isLight = theme.palette.mode === 'light';

          const backgroundColor = !mounted
            ? 'transparent'
            : {
                xs: elevated ? frosted : 'transparent',
                md: elevated ? frosted : isLight ? 'transparent' : frostedRest,
              };

          const backdrop = !mounted
            ? 'none'
            : {
                xs: elevated ? blur : 'none',
                md: elevated ? blur : isLight ? 'none' : blur,
              };

          return {
            ...(pinToViewport ? { top: 0, left: 0, right: 0 } : { width: '100%' }),
            color: 'text.primary',
            backgroundColor,
            backdropFilter: backdrop,
            WebkitBackdropFilter: backdrop,
            borderBottom: 'none',
            boxShadow: 'none',
            backgroundImage: 'none',
            transform: pinToViewport && headerHidden ? 'translateY(-100%)' : 'translateY(0)',
            transition: pinToViewport
              ? theme.transitions.create(['transform', 'background-color'], {
                  duration: 220,
                  easing: theme.transitions.easing.easeInOut,
                })
              : 'none',
            zIndex: theme.zIndex.appBar,
            willChange: pinToViewport ? 'transform' : 'auto',
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'background-color 0.2s ease',
            },
          };
        }}
      >
        <Container
          maxWidth="xl"
          sx={{ pl: { xs: 1, sm: 2, md: 3 }, pr: { xs: 1.5, sm: 2, md: 3 } }}
        >
          <Toolbar disableGutters sx={{ minHeight: TOOLBAR_MIN_HEIGHT, gap: { xs: 1, md: 2 } }}>
            <Box
              component={RouterLink}
              href={paths.home}
              aria-label={t.chrome.homeAria}
              sx={{
                display: 'inline-flex',
                textDecoration: 'none',
                color: 'inherit',
                flexShrink: 0,
                ml: { xs: -0.25, md: 0 },
              }}
            >
              <BrandLogo
                height={56}
                showWordmark
                wordmarkPresentation="brand"
                wordmarkLayout="stacked"
                imgSx={{ height: { xs: 52, md: 62 }, width: 'auto' }}
                wordmarkSx={{
                  fontSize: { xs: '1.05rem', md: '1.22rem' },
                  lineHeight: 1.02,
                  letterSpacing: '-0.05em',
                }}
              />
            </Box>

            <HeaderMobileSearch />

            <Stack
              direction="row"
              spacing={1.25}
              sx={{
                alignItems: 'center',
                display: { xs: 'none', md: 'flex' },
                flexShrink: 0,
                ml: { md: 'auto' },
              }}
            >
              <ThemeModeToggle iconSize={26} />
              {user ? (
                <>
                  <Tooltip title={t.common.myPanel}>
                    <IconButton
                      component={RouterLink}
                      href={accountHref}
                      sx={{ color: 'text.secondary', width: 44, height: 44 }}
                    >
                      {React.createElement(UserCircleIcon, { size: 28 })}
                    </IconButton>
                  </Tooltip>
                  <Button
                    onClick={openPostPicker}
                    variant="contained"
                    size="large"
                    startIcon={React.createElement(PlusIcon, { size: 20, weight: 'bold' })}
                    sx={{
                      borderRadius: 2.25,
                      fontWeight: 700,
                      textTransform: 'none',
                      px: 2.5,
                      py: 1.1,
                      fontSize: '0.95rem',
                    }}
                  >
                    {t.common.postListing}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    component={RouterLink}
                    href={paths.user.auth}
                    size="large"
                    sx={{
                      borderRadius: 2.25,
                      color: 'text.primary',
                      fontWeight: 600,
                      textTransform: 'none',
                      px: 2.5,
                      py: 1.1,
                      fontSize: '0.95rem',
                    }}
                    startIcon={React.createElement(SignInIcon, { size: 20 })}
                  >
                    {t.common.login}
                  </Button>
                  <Button
                    component={RouterLink}
                    href={paths.user.realEstateListing}
                    variant="contained"
                    size="large"
                    startIcon={React.createElement(PlusIcon, { size: 20, weight: 'bold' })}
                    sx={{
                      borderRadius: 2.25,
                      fontWeight: 700,
                      textTransform: 'none',
                      px: 2.5,
                      py: 1.1,
                      fontSize: '0.95rem',
                    }}
                  >
                    {t.common.postFree}
                  </Button>
                </>
              )}
            </Stack>

            <Stack
              direction="row"
              spacing={0.75}
              sx={{
                alignItems: 'center',
                display: { xs: 'flex', md: 'none' },
                flexShrink: 0,
                ml: 'auto',
              }}
            >
              <Tooltip title={t.common.postListing}>
                <IconButton
                  onClick={openPostPicker}
                  aria-label={t.common.postListing}
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': { bgcolor: 'primary.dark', color: 'primary.contrastText' },
                  }}
                >
                  {React.createElement(PlusIcon, { size: 18, weight: 'bold' })}
                </IconButton>
              </Tooltip>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>
      {pinToViewport ? (
        <Toolbar
          disableGutters
          aria-hidden
          sx={{
            minHeight: TOOLBAR_MIN_HEIGHT,
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
        />
      ) : null}
      <AddListingPickerDialog open={addListingOpen} onClose={() => setAddListingOpen(false)} />
    </>
  );
}
