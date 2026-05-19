'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Drawer, IconButton, Stack, Typography } from '@mui/material';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { House as HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { UserCircle as UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { useUser } from '@/hooks/use-user';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { paths } from '@/paths';

import { HeroSearch } from './hero-search';

interface NavItem {
  id: string;
  ariaLabel: string;
  href: string;
  activeWhen: (pathname: string | null) => boolean;
  icon: React.ComponentType<{ size?: number; weight?: 'fill' | 'regular' }>;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const isAuthed = Boolean(user);
  const [searchOpen, setSearchOpen] = React.useState(false);

  const items: NavItem[] = React.useMemo(
    () => [
      {
        id: 'home',
        ariaLabel: 'Kreu',
        href: paths.home,
        activeWhen: (p) => p === paths.home,
        icon: HouseIcon,
      },
      {
        id: 'saved',
        ariaLabel: 'Të ruajturat',
        href: isAuthed ? paths.user.myRealEstateListings : paths.user.auth,
        activeWhen: (p) => Boolean(p?.startsWith(paths.user.myRealEstateListings)),
        icon: BookmarkSimpleIcon,
      },
      {
        id: 'search',
        ariaLabel: 'Kërko',
        href: paths.public.realEstate,
        activeWhen: (p) =>
          Boolean(
            p === paths.public.realEstate ||
              p === paths.public.cars ||
              p === paths.public.jobs ||
              p === paths.public.marketplace ||
              p === paths.public.businesses ||
              p === paths.public.professionals,
          ),
        icon: MagnifyingGlassIcon,
      },
      {
        id: 'messages',
        ariaLabel: 'Mesazhet',
        href: isAuthed ? paths.user.dashboard : paths.user.auth,
        activeWhen: (p) => Boolean(p?.startsWith(paths.user.dashboard)),
        icon: ChatsCircleIcon,
      },
      {
        id: 'profile',
        ariaLabel: 'Profili',
        href: isAuthed ? paths.user.profile : paths.user.auth,
        activeWhen: (p) => Boolean(p?.startsWith(paths.user.profile)),
        icon: UserCircleIcon,
      },
    ],
    [isAuthed],
  );

  return (
    <Box
      component="nav"
      aria-label="Navigimi i poshtëm"
      sx={(theme) => ({
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.appBar,
        display: { xs: 'block', md: 'none' },
        borderTop: '1px solid',
        borderColor: 'divider',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        backgroundColor:
          theme.palette.mode === 'dark'
            ? 'rgb(var(--mui-palette-background-paperChannel) / 0.92)'
            : 'rgb(var(--mui-palette-background-paperChannel) / 0.96)',
      })}
    >
      <Stack
        direction="row"
        sx={{
          justifyContent: 'space-around',
          px: 1,
          pt: 0.75,
          pb: 'calc(6px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.id === 'search' ? searchOpen || item.activeWhen(pathname) : item.activeWhen(pathname);

          const itemSx = {
            width: 52,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 2,
            color: active ? 'primary.main' : 'text.secondary',
            bgcolor: active ? primaryMainAlpha(0.1) : 'transparent',
          } as const;

          if (item.id === 'search') {
            return (
              <Stack
                key={item.id}
                component="button"
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-expanded={searchOpen}
                aria-controls="mobile-hero-search-sheet"
                aria-label={item.ariaLabel}
                sx={{
                  ...itemSx,
                  border: 0,
                  cursor: 'pointer',
                  font: 'inherit',
                  padding: 0,
                  appearance: 'none',
                  WebkitAppearance: 'none',
                }}
              >
                <Icon size={24} weight={active ? 'fill' : 'regular'} />
              </Stack>
            );
          }

          return (
            <Stack
              key={item.id}
              component={RouterLink}
              href={item.href}
              aria-label={item.ariaLabel}
              sx={{
                ...itemSx,
                textDecoration: 'none',
              }}
            >
              <Icon size={24} weight={active ? 'fill' : 'regular'} />
            </Stack>
          );
        })}
      </Stack>

      <Drawer
        anchor="bottom"
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        slotProps={{
          paper: {
            id: 'mobile-hero-search-sheet',
            'aria-labelledby': 'mobile-search-title',
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: 'min(92dvh, 920px)',
              backgroundImage: 'none',
              pb: 'env(safe-area-inset-bottom, 0px)',
            },
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            pt: 1.5,
            pb: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography id="mobile-search-title" variant="subtitle1" sx={{ fontWeight: 700 }}>
            Kërko në KuTaGjej
          </Typography>
          <IconButton
            type="button"
            edge="end"
            onClick={() => setSearchOpen(false)}
            aria-label="Mbyll kërkimin"
          >
            <XIcon size={22} />
          </IconButton>
        </Box>
        <Box sx={{ px: 2, py: 2.5, overflow: 'auto' }}>
          <HeroSearch onNavigate={() => setSearchOpen(false)} />
        </Box>
      </Drawer>
    </Box>
  );
}
