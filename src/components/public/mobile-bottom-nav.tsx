'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Stack } from '@mui/material';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { House as HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { UserCircle as UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';

import { useCopy } from '@/hooks/use-copy';
import { useUser } from '@/hooks/use-user';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import {
  MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX,
  MOBILE_BOTTOM_NAV_FLOAT_INSET_PX,
} from '@/lib/mobile-layout';
import { isPostListingPath } from '@/lib/post-listing-path';
import { paths } from '@/paths';

/** Equal inset on every side between holding bar and selected pill. */
const NAV_INSET_PX = 4;

/** Survives public ↔ dashboard shell remounts so first→last still slides. */
let persistedFromIndex = 0;

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
  const t = useCopy();
  const isAuthed = Boolean(user);
  const searchActive = Boolean(pathname?.startsWith(paths.public.search));
  const [indicatorIndex, setIndicatorIndex] = React.useState(persistedFromIndex);
  const [transitionReady, setTransitionReady] = React.useState(false);

  const items: NavItem[] = React.useMemo(
    () => [
      {
        id: 'home',
        ariaLabel: t.chrome.navHome,
        href: paths.home,
        activeWhen: (p) => p === paths.home || isPostListingPath(p),
        icon: HouseIcon,
      },
      {
        id: 'saved',
        ariaLabel: t.chrome.navSaved,
        href: isAuthed ? paths.user.savedListings : paths.user.auth,
        activeWhen: (p) => Boolean(p?.startsWith(paths.user.savedListings)),
        icon: BookmarkSimpleIcon,
      },
      {
        id: 'messages',
        ariaLabel: t.chrome.navMessages,
        href: isAuthed ? paths.user.messages : paths.user.auth,
        activeWhen: (p) => Boolean(p?.startsWith(paths.user.messages)),
        icon: ChatsCircleIcon,
      },
      {
        id: 'profile',
        ariaLabel: t.chrome.navProfile,
        href: isAuthed ? paths.user.dashboard : paths.user.auth,
        activeWhen: (p) =>
          Boolean(
            p?.startsWith('/user/dashboard') &&
              !p.startsWith(paths.user.messages) &&
              !p.startsWith(paths.user.savedListings) &&
              !isPostListingPath(p),
          ),
        icon: UserCircleIcon,
      },
    ],
    [isAuthed, t],
  );

  const activeIndex = items.findIndex((item) => item.activeWhen(pathname));
  const hasActiveTab = activeIndex >= 0;
  const slotCount = items.length;

  React.useEffect(() => {
    if (activeIndex < 0) return undefined;

    const target = activeIndex;

    if (transitionReady) {
      setIndicatorIndex(target);
      persistedFromIndex = target;
      return undefined;
    }

    setIndicatorIndex(persistedFromIndex);

    if (persistedFromIndex === target) {
      setTransitionReady(true);
      return undefined;
    }

    let frame2 = 0;
    const frame1 = requestAnimationFrame(() => {
      setTransitionReady(true);
      frame2 = requestAnimationFrame(() => {
        setIndicatorIndex(target);
        persistedFromIndex = target;
      });
    });

    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
    };
  }, [activeIndex, transitionReady]);

  const moveIndicatorTo = (index: number) => {
    persistedFromIndex = indicatorIndex;
    setTransitionReady(true);
    setIndicatorIndex(index);
  };

  return (
    <Box
      component="nav"
      aria-label={t.chrome.bottomNavAria}
      sx={(theme) => ({
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: `calc(${MOBILE_BOTTOM_NAV_FLOAT_INSET_PX}px + env(safe-area-inset-bottom, 0px))`,
        zIndex: theme.zIndex.appBar,
        display: { xs: 'flex', lg: 'none' },
        justifyContent: 'center',
        px: 2,
        pointerEvents: 'none',
      })}
    >
      <Stack
        direction="row"
        spacing={1.25}
        sx={{
          width: '100%',
          maxWidth: 420,
          alignItems: 'center',
          pointerEvents: 'auto',
        }}
      >
        <Box
          sx={{
            flex: 1,
            height: MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX,
            boxSizing: 'border-box',
            p: `${NAV_INSET_PX}px`,
            overflow: 'hidden',
            borderRadius: 999,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'rgb(var(--mui-palette-background-paperChannel) / 0.94)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 10px 28px rgba(0, 0, 0, 0.22)',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
            }}
          >
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: `${100 / slotCount}%`,
                borderRadius: 999,
                bgcolor: primaryMainAlpha(0.18),
                opacity: hasActiveTab ? 1 : 0,
                transform: `translate3d(${indicatorIndex * 100}%, 0, 0)`,
                transition: transitionReady
                  ? 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease'
                  : 'none',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />

            <Box
              sx={{
                position: 'relative',
                zIndex: 1,
                display: 'grid',
                gridTemplateColumns: `repeat(${slotCount}, minmax(0, 1fr))`,
                height: '100%',
              }}
            >
              {items.map((item, index) => {
                const Icon = item.icon;
                const active = item.activeWhen(pathname);

                return (
                  <Box
                    key={item.id}
                    component={RouterLink}
                    href={item.href}
                    aria-label={item.ariaLabel}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => moveIndicatorTo(index)}
                    sx={{
                      minWidth: 0,
                      height: '100%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 999,
                      color: active ? 'primary.main' : 'text.secondary',
                      textDecoration: 'none',
                      transition: 'color 200ms ease',
                    }}
                  >
                    <Icon size={24} weight={active ? 'fill' : 'regular'} />
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>

        <Box
          component={RouterLink}
          href={paths.public.search}
          aria-label={t.common.search}
          aria-current={searchActive ? 'page' : undefined}
          sx={{
            width: MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX,
            height: MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX,
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            color: 'primary.contrastText',
            bgcolor: 'primary.main',
            boxShadow: '0 10px 28px rgba(0, 0, 0, 0.22)',
            textDecoration: 'none',
            transition: 'background-color 160ms ease, transform 160ms ease',
            '&:active': {
              transform: 'scale(0.96)',
            },
          }}
        >
          <MagnifyingGlassIcon size={24} weight={searchActive ? 'fill' : 'regular'} />
        </Box>
      </Stack>
    </Box>
  );
}
