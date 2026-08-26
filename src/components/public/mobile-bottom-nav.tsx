'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge, Box, Stack } from '@mui/material';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { House as HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { UserCircle as UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';

import { useCopy } from '@/hooks/use-copy';
import { useDisplayPathname } from '@/hooks/use-navigation-pending';
import { useUnreadMessagesCount } from '@/hooks/use-unread-messages-count';
import { useUser } from '@/hooks/use-user';
import { useOptionalSearchOverlay } from '@/contexts/search-overlay-context';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { hardNavigate, hardRefreshToTop } from '@/lib/hard-navigate';
import {
  MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX,
  MOBILE_BOTTOM_NAV_FLOAT_INSET_PX,
} from '@/lib/mobile-layout';
import { MAIN_TAB_SLIDE_MS } from '@/lib/main-tab-pager';
import { normalizeNavPath } from '@/lib/navigation-pending';
import { isPublicBrowsePath } from '@/lib/public-browse-path';
import { paths } from '@/paths';
import { MOTION } from '@/styles/motion';

function hrefPath(href: string): string {
  return href.split('?')[0] || href;
}

/** Equal inset on every side between holding bar and selected pill. */
const NAV_INSET_PX = 4;

/** Survives public ↔ dashboard shell remounts so first→last still slides. */
let persistedFromIndex = 0;

interface NavItem {
  id: string;
  ariaLabel: string;
  href: string;
  activeWhen: (pathname: string | null) => boolean;
  icon: React.ComponentType<{ size?: number; weight?: 'fill' | 'regular'; color?: string }>;
}

function resolveNavPathname(displayPathname: string): string {
  if (displayPathname) return normalizeNavPath(displayPathname);
  if (typeof window !== 'undefined') {
    return normalizeNavPath(window.location.pathname || paths.home);
  }
  return paths.home;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const displayPathname = resolveNavPathname(useDisplayPathname());
  const { user } = useUser();
  const unreadMessages = useUnreadMessagesCount();
  const t = useCopy();
  const searchOverlay = useOptionalSearchOverlay();
  const isAuthed = Boolean(user);
  const searchActive =
    Boolean(searchOverlay?.open) ||
    Boolean(displayPathname.startsWith(paths.public.search)) ||
    isPublicBrowsePath(displayPathname);

  const items: NavItem[] = React.useMemo(
    () => [
      {
        id: 'home',
        ariaLabel: t.chrome.navHome,
        href: paths.home,
        activeWhen: (p) => p === paths.home,
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
              !p.startsWith(paths.user.savedListings),
          ),
        icon: UserCircleIcon,
      },
    ],
    [isAuthed, t],
  );

  const activeIndex = items.findIndex((item) => item.activeWhen(displayPathname));
  const hasActiveTab = activeIndex >= 0;
  const slotCount = items.length;
  const [indicatorIndex, setIndicatorIndex] = React.useState(persistedFromIndex);
  const [transitionReady, setTransitionReady] = React.useState(false);

  React.useLayoutEffect(() => {
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

  const handleTabClick = (event: React.MouseEvent, item: NavItem, index: number) => {
    moveIndicatorTo(index);
    if (!item.activeWhen(pathname)) return;

    // Already on this tab's root → scroll to top + soft refresh.
    // Active on a nested route (e.g. settings under Profile) → go to tab root.
    if (pathname === hrefPath(item.href)) {
      // Open conversation (`?c=`) still uses the messages path — retap must clear it
      // and show the inbox instead of refreshing the same thread.
      // Read from window (click-only) so this nav can prerender without useSearchParams/Suspense.
      if (
        item.id === 'messages' &&
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('c')
      ) {
        hardNavigate(item.href, event);
        return;
      }
      hardRefreshToTop(event);
      return;
    }
    hardNavigate(item.href, event);
  };

  const handleSearchClick = (event: React.MouseEvent) => {
    event.preventDefault();
    if (pathname === paths.public.search) {
      hardRefreshToTop(event);
      return;
    }
    if (searchOverlay?.open) return;
    searchOverlay?.openSearch();
  };

  const isSearchPage = Boolean(displayPathname.startsWith(paths.public.search));
  if (isSearchPage) return null;

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
            bgcolor: 'background.paper',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            boxShadow: 'none',
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
                  ? `transform ${MAIN_TAB_SLIDE_MS}ms ${MOTION.ease}, opacity 180ms ease`
                  : 'none',
                pointerEvents: 'none',
                zIndex: 0,
                '@media (prefers-reduced-motion: reduce)': {
                  transition: 'none',
                },
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
                const active = item.activeWhen(displayPathname);
                const isMessages = item.id === 'messages';
                const iconColor = active
                  ? 'var(--mui-palette-primary-main)'
                  : 'var(--mui-palette-text-secondary)';

                return (
                  <Box
                    key={item.id}
                    component={RouterLink}
                    href={item.href}
                    aria-label={item.ariaLabel}
                    aria-current={active ? 'page' : undefined}
                    onClick={(event) => handleTabClick(event, item, index)}
                    sx={{
                      minWidth: 0,
                      height: '100%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 999,
                      color: 'inherit',
                      textDecoration: 'none',
                      transition: 'transform 160ms cubic-bezier(0.22, 1, 0.36, 1)',
                      '&:link, &:visited, &:hover, &:active': {
                        color: 'inherit',
                      },
                      '&:active': {
                        transform: 'scale(0.94)',
                      },
                    }}
                  >
                    <Badge
                      color="error"
                      badgeContent={unreadMessages > 99 ? '99+' : unreadMessages}
                      invisible={!isMessages || unreadMessages <= 0}
                      overlap="circular"
                    >
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-flex',
                          color: iconColor,
                          '& svg': {
                            color: iconColor,
                            fill: iconColor,
                          },
                        }}
                      >
                        <Icon
                          key={active ? 'fill' : 'regular'}
                          size={24}
                          weight={active ? 'fill' : 'regular'}
                          color={iconColor}
                        />
                      </Box>
                    </Badge>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>

        <Box
          component="button"
          type="button"
          aria-label={t.common.search}
          aria-haspopup="dialog"
          aria-expanded={Boolean(searchOverlay?.open)}
          aria-current={searchActive ? 'page' : undefined}
          onClick={handleSearchClick}
          sx={{
            width: MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX,
            height: MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX,
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            p: 0,
            appearance: 'none',
            WebkitAppearance: 'none',
            cursor: 'pointer',
            borderRadius: '50%',
            color: 'primary.contrastText',
            bgcolor: 'primary.main',
            boxShadow: 'none',
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
