'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge, Box } from '@mui/material';
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
  SAFE_AREA_BOTTOM,
} from '@/lib/mobile-layout';
import { previewMainTabIndex, MAIN_TAB_SLIDE_MS, registerMainTabNavProgress } from '@/lib/main-tab-pager';
import { mainTabFromPath } from '@/lib/main-tabs';
import { beginPendingNavigation, normalizeNavPath } from '@/lib/navigation-pending';
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
  href?: string;
  kind?: 'link' | 'search';
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
  const [navRoot, setNavRoot] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    setNavRoot(document.documentElement);
  }, []);
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
        activeWhen: (p) => p === paths.home && !searchActive,
        icon: HouseIcon,
      },
      {
        id: 'saved',
        ariaLabel: t.chrome.navSaved,
        href: isAuthed ? paths.user.savedListings : paths.user.auth,
        // Must clear when search is open — Save is before Search in the list, so
        // findIndex would keep Save and leave the pill stuck on Search after close.
        activeWhen: (p) =>
          Boolean(p?.startsWith(paths.user.savedListings)) && !searchActive,
        icon: BookmarkSimpleIcon,
      },
      {
        id: 'search',
        kind: 'search',
        ariaLabel: t.common.search,
        activeWhen: () => searchActive,
        icon: MagnifyingGlassIcon,
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
    [isAuthed, searchActive, t],
  );

  const activeIndex = items.findIndex((item) => item.activeWhen(displayPathname));
  const hasActiveTab = activeIndex >= 0;
  const slotCount = items.length;
  const [indicatorIndex, setIndicatorIndex] = React.useState(persistedFromIndex);
  const [transitionReady, setTransitionReady] = React.useState(false);
  const pillRef = React.useRef<HTMLDivElement | null>(null);
  /** Set on touch, before the route (and activeIndex) catches up. */
  const touchPreviewRef = React.useRef<number | null>(null);

  const paintPill = React.useCallback((fraction: number, animate: boolean) => {
    const el = pillRef.current;
    if (!el) return;
    const motion =
      animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? `transform ${MAIN_TAB_SLIDE_MS}ms ${MOTION.easeIos}`
        : 'none';
    const next = `translate3d(${fraction * 100}%, 0, 0)`;
    if (el.style.transform === next && el.style.transition === motion) return;
    el.style.transition = motion;
    el.style.transform = next;
  }, []);

  React.useLayoutEffect(() => {
    paintPill(indicatorIndex, transitionReady);
  }, [indicatorIndex, paintPill, transitionReady]);

  React.useEffect(() => {
    registerMainTabNavProgress(paintPill);
    return () => registerMainTabNavProgress(null);
  }, [paintPill]);

  React.useLayoutEffect(() => {
    if (activeIndex < 0) return undefined;
    if (touchPreviewRef.current != null && touchPreviewRef.current !== activeIndex) return undefined;

    touchPreviewRef.current = null;
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

  const slideTabTo = (index: number, item: NavItem) => {
    // Write the pill and the page track in this event, before React renders.
    // Only lock while the highlight is ahead of the route — a retap of the
    // current tab must not block later swipe updates.
    touchPreviewRef.current = index === activeIndex ? null : index;
    paintPill(index, true);
    persistedFromIndex = index;
    setTransitionReady(true);
    setIndicatorIndex(index);

    const href = item.kind === 'search' ? paths.public.search : item.href;
    const tab = href ? mainTabFromPath(hrefPath(href)) : null;
    if (tab) previewMainTabIndex(tab.index, true);
  };

  const revertTabSlide = () => {
    touchPreviewRef.current = null;
    const back = activeIndex >= 0 ? activeIndex : persistedFromIndex;
    paintPill(back, true);
    persistedFromIndex = back;
    setIndicatorIndex(back);
    const item = items[back];
    if (!item) return;
    const href = item.kind === 'search' ? paths.public.search : item.href;
    const tab = href ? mainTabFromPath(hrefPath(href)) : null;
    if (tab) previewMainTabIndex(tab.index, true);
  };

  const handleTabPointerDown = (event: React.PointerEvent, item: NavItem, index: number) => {
    if (event.button !== 0) return;
    slideTabTo(index, item);
  };

  const handleTabPointerUp = (event: React.PointerEvent, index: number) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (!inside) revertTabSlide();
    else persistedFromIndex = index;
  };

  const handleSearchClick = (event: React.MouseEvent, index: number) => {
    event.preventDefault();
    slideTabTo(index, items[index]!);
    if (searchOverlay?.open) {
      searchOverlay.closeSearch({ immediate: true, replaceHistory: true });
    }
    if (displayPathname === paths.public.search || displayPathname.startsWith(`${paths.public.search}/`)) {
      hardRefreshToTop(event);
      return;
    }
    beginPendingNavigation(paths.public.search);
    hardNavigate(paths.public.search, event);
  };

  const handleTabClick = (event: React.MouseEvent, item: NavItem, index: number) => {
    if (item.kind === 'search') {
      handleSearchClick(event, index);
      return;
    }
    if (searchOverlay?.open) {
      searchOverlay.closeSearch({ immediate: true, replaceHistory: true });
    }
    slideTabTo(index, item);
    if (!item.activeWhen(pathname)) return;
    if (!item.href) return;

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

  const nav = (
    <Box
      component="nav"
      aria-label={t.chrome.bottomNavAria}
      data-kg-bottom-nav=""
      sx={(theme) => ({
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: `calc(${MOBILE_BOTTOM_NAV_FLOAT_INSET_PX}px + ${SAFE_AREA_BOTTOM})`,
        zIndex: theme.zIndex.modal + 12,
        display: { xs: 'flex', lg: 'none' },
        justifyContent: 'center',
        px: 2,
        pointerEvents: 'none',
      })}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 420,
          height: MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX,
          boxSizing: 'border-box',
          p: `${NAV_INSET_PX}px`,
          overflow: 'hidden',
          borderRadius: 999,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          pointerEvents: 'auto',
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
            ref={pillRef}
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
              transition: 'opacity 180ms ease',
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
              const sharedSx = {
                minWidth: 0,
                height: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 999,
                color: 'inherit',
                textDecoration: 'none',
                border: 'none',
                p: 0,
                appearance: 'none',
                WebkitAppearance: 'none',
                bgcolor: 'transparent',
                cursor: 'pointer',
                '&:link, &:visited, &:hover, &:active': {
                  color: 'inherit',
                  transform: 'none',
                },
              } as const;

              const content = (
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
              );

              if (item.kind === 'search') {
                return (
                  <Box
                    key={item.id}
                    component="button"
                    type="button"
                    aria-label={item.ariaLabel}
                    aria-haspopup="dialog"
                    aria-expanded={Boolean(searchOverlay?.open)}
                    aria-current={active ? 'page' : undefined}
                    onPointerDown={(event) => handleTabPointerDown(event, item, index)}
                    onPointerUp={(event) => handleTabPointerUp(event, index)}
                    onPointerCancel={revertTabSlide}
                    onClick={(event) => handleTabClick(event, item, index)}
                    sx={sharedSx}
                  >
                    {content}
                  </Box>
                );
              }

              return (
                <Box
                  key={item.id}
                  component={RouterLink}
                  href={item.href || paths.home}
                  aria-label={item.ariaLabel}
                  aria-current={active ? 'page' : undefined}
                  onPointerDown={(event) => handleTabPointerDown(event, item, index)}
                  onPointerUp={(event) => handleTabPointerUp(event, index)}
                  onPointerCancel={revertTabSlide}
                  onClick={(event) => handleTabClick(event, item, index)}
                  sx={sharedSx}
                >
                  {content}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return navRoot ? createPortal(nav, navRoot) : nav;
}
