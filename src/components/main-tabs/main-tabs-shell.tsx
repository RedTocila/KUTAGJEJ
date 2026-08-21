'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Box } from '@mui/material';

import { MainTabsGuestPane } from '@/components/main-tabs/main-tabs-guest-pane';
import { MainTabsHomePreview } from '@/components/main-tabs/main-tabs-home-preview';
import { MobileBottomNav } from '@/components/public/mobile-bottom-nav';
import { SavedListingsView } from '@/components/user/saved-listings-view';
import { UserMessagesView } from '@/components/user/messages/user-messages-view';
import { MessagesThreadChromeProvider } from '@/contexts/messages-thread-chrome-context';
import { useOptionalSearchOverlay } from '@/contexts/search-overlay-context';
import { useCopy } from '@/hooks/use-copy';
import { useDisplayPathname } from '@/hooks/use-navigation-pending';
import { useWarmMainTabs } from '@/hooks/use-warm-main-tabs';
import { useUser } from '@/hooks/use-user';
import { hardNavigate } from '@/lib/hard-navigate';
import {
  MAIN_TAB_COUNT,
  MAIN_TABS_MOBILE_MQ,
  clampMainTabIndex,
  mainTabByIndex,
  mainTabFromPath,
  type MainTab,
} from '@/lib/main-tabs';
import { MOBILE_CONTENT_BOTTOM_PADDING } from '@/lib/mobile-layout';
import { beginPendingNavigation } from '@/lib/navigation-pending';
import { MOTION } from '@/styles/motion';
import { paths } from '@/paths';

const UserDashboardHome = React.lazy(async () => {
  const mod = await import('@/app/user/dashboard/page');
  return { default: mod.UserDashboardHome };
});

type MainTabsContextValue = {
  active: boolean;
  hosted: boolean;
  tab: MainTab | null;
  threadOpen: boolean;
  setThreadOpen: (open: boolean | null) => void;
  /** Scroll container for the visible tab pane (window when the pager is off). */
  scrollParent: HTMLElement | null;
};

const MainTabsContext = React.createContext<MainTabsContextValue>({
  active: false,
  hosted: false,
  tab: null,
  threadOpen: false,
  setThreadOpen: () => {},
  scrollParent: null,
});

export function useMainTabs(): MainTabsContextValue {
  return React.useContext(MainTabsContext);
}

/** True when the mobile pager is showing the hosted Saves/Messages/Profile views. */
export function useMainTabsHosted(): boolean {
  return React.useContext(MainTabsContext).hosted;
}

export function useMainTabsPagerActive(): boolean {
  return React.useContext(MainTabsContext).active;
}

export function useMainTabsScrollParent(): HTMLElement | null {
  return React.useContext(MainTabsContext).scrollParent;
}

function canUsePortal(user: ReturnType<typeof useUser>['user']): boolean {
  return Boolean(
    user &&
      (user.accountType === 'individual' ||
        user.accountType === 'business' ||
        user.role === 'business-user'),
  );
}

function isTabSwipeBlocked(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('[data-no-tab-swipe]')) return true;
  if (target.closest('input, textarea, select, [contenteditable="true"]')) return true;
  let el: Element | null = target;
  while (el instanceof HTMLElement) {
    const style = window.getComputedStyle(el);
    if (
      (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
      el.scrollWidth > el.clientWidth + 12
    ) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

function useMobileTabsMq(): boolean {
  const [mobile, setMobile] = React.useState(false);
  React.useLayoutEffect(() => {
    const mq = window.matchMedia(MAIN_TABS_MOBILE_MQ);
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return mobile;
}

function shouldMountPane(index: number, current: number, visited: ReadonlySet<number>): boolean {
  if (index === 0) return true;
  return index === current || Math.abs(index - current) <= 1 || visited.has(index);
}

function ThreadQuerySync({
  isMessages,
  onChange,
}: {
  isMessages: boolean;
  onChange: (open: boolean) => void;
}) {
  const searchParams = useSearchParams();
  React.useLayoutEffect(() => {
    onChange(isMessages && Boolean(searchParams.get('c')));
  }, [isMessages, onChange, searchParams]);
  return null;
}

export function MainTabsShell({ children }: { children: React.ReactNode }) {
  return <MainTabsShellInner>{children}</MainTabsShellInner>;
}

function MainTabsShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const displayPathname = useDisplayPathname();
  const mobile = useMobileTabsMq();
  const { user } = useUser();
  const t = useCopy();
  const searchOverlay = useOptionalSearchOverlay();
  const authed = canUsePortal(user);
  useWarmMainTabs();

  const routeTab = mainTabFromPath(pathname);
  const displayTab = mainTabFromPath(displayPathname) ?? routeTab;
  const [urlThreadOpen, setUrlThreadOpen] = React.useState(false);
  const [threadUiOpen, setThreadUiOpen] = React.useState<boolean | null>(null);
  const setUrlThreadOpenStable = React.useCallback((open: boolean) => {
    setUrlThreadOpen(open);
  }, []);
  const threadOpen = threadUiOpen ?? urlThreadOpen;

  React.useEffect(() => {
    setThreadUiOpen(null);
  }, [urlThreadOpen, routeTab?.id]);

  const pagerEligible = Boolean(mobile && displayTab);
  const pagerActive = pagerEligible && !threadOpen;
  const hosted = Boolean(mobile && displayTab);

  const [visited, setVisited] = React.useState<Set<number>>(() => new Set([displayTab?.index ?? 0]));
  React.useEffect(() => {
    if (displayTab == null) return;
    setVisited((prev) => {
      if (prev.has(displayTab.index)) return prev;
      const next = new Set(prev);
      next.add(displayTab.index);
      return next;
    });
  }, [displayTab]);

  const index = displayTab?.index ?? 0;
  const indexRef = React.useRef(index);
  indexRef.current = index;
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const paneRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const [scrollParent, setScrollParent] = React.useState<HTMLElement | null>(null);
  const setPaneRef = React.useCallback((paneIndex: number) => {
    return (node: unknown) => {
      const el = node instanceof HTMLDivElement ? node : null;
      paneRefs.current[paneIndex] = el;
      if (paneIndex === indexRef.current) setScrollParent(el);
    };
  }, []);
  const dragXRef = React.useRef(0);
  const [dragX, setDragX] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const startRef = React.useRef<{
    x: number;
    y: number;
    t: number;
    locked: boolean | null;
    blocked: boolean;
  } | null>(null);

  const setThreadOpen = React.useCallback((open: boolean | null) => {
    setThreadUiOpen(open);
  }, []);

  const goToIndex = React.useCallback(
    (nextIndex: number) => {
      const clamped = clampMainTabIndex(nextIndex);
      if (clamped === index) return;
      const tab = mainTabByIndex(clamped);
      if (!tab) return;
      if (!authed && tab.id !== 'home') {
        beginPendingNavigation(paths.user.auth);
        hardNavigate(paths.user.auth);
        return;
      }
      beginPendingNavigation(tab.href);
      hardNavigate(tab.href);
    },
    [authed, index],
  );

  React.useLayoutEffect(() => {
    if (!hosted) {
      setScrollParent(null);
      return;
    }
    setScrollParent(paneRefs.current[index] ?? null);
  }, [hosted, index]);

  React.useEffect(() => {
    if (!pagerActive) return;
    const pane = paneRefs.current[index];
    if (pane) pane.scrollTop = 0;
  }, [index, pagerActive]);

  React.useEffect(() => {
    if (!hosted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [hosted]);

  React.useEffect(() => {
    if (!pagerActive) return;
    const el = viewportRef.current;
    if (!el) return;

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      if (searchOverlay?.open || threadOpen) return;
      const touch = event.touches[0]!;
      startRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        t: Date.now(),
        locked: null,
        blocked: isTabSwipeBlocked(event.target),
      };
      dragXRef.current = 0;
    };

    const onMove = (event: TouchEvent) => {
      const start = startRef.current;
      if (!start || start.blocked || event.touches.length !== 1) return;
      const touch = event.touches[0]!;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (start.locked == null) {
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
        start.locked = Math.abs(dx) > Math.abs(dy) * 1.15;
        if (!start.locked) return;
        setDragging(true);
      }
      if (!start.locked) return;
      event.preventDefault();
      const width = el.clientWidth || window.innerWidth;
      let next = dx;
      if (index <= 0 && next > 0) next *= 0.35;
      if (index >= MAIN_TAB_COUNT - 1 && next < 0) next *= 0.35;
      next = Math.max(-width, Math.min(width, next));
      dragXRef.current = next;
      setDragX(next);
    };

    const onEnd = () => {
      const start = startRef.current;
      startRef.current = null;
      const dx = dragXRef.current;
      if (!start || start.blocked || start.locked !== true) {
        dragXRef.current = 0;
        setDragX(0);
        setDragging(false);
        return;
      }
      const width = el.clientWidth || window.innerWidth;
      const dt = Math.max(1, Date.now() - start.t);
      const vx = dx / dt;
      const commit = Math.abs(dx) > width * 0.2 || Math.abs(vx) > 0.45;
      if (commit) {
        if (dx < 0) goToIndex(index + 1);
        else goToIndex(index - 1);
        dragXRef.current = 0;
        setDragX(0);
        requestAnimationFrame(() => setDragging(false));
        return;
      }
      dragXRef.current = 0;
      setDragX(0);
      setDragging(false);
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [goToIndex, index, pagerActive, searchOverlay?.open, threadOpen]);

  const ctx = React.useMemo<MainTabsContextValue>(
    () => ({
      active: pagerActive,
      hosted,
      tab: displayTab,
      threadOpen,
      setThreadOpen,
      scrollParent,
    }),
    [displayTab, hosted, pagerActive, scrollParent, setThreadOpen, threadOpen],
  );

  if (!hosted) {
    return <MainTabsContext.Provider value={ctx}>{children}</MainTabsContext.Provider>;
  }

  const widthPercent = 100 / MAIN_TAB_COUNT;
  const translate = `translate3d(calc(${-index * widthPercent}% + ${dragX}px), 0, 0)`;

  const paneSx = {
    width: `${widthPercent}%`,
    height: '100%',
    overflowX: 'hidden',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    overscrollBehaviorY: 'contain',
    overscrollBehaviorX: 'none',
  } as const;

  return (
    <MainTabsContext.Provider value={ctx}>
      <React.Suspense fallback={null}>
        <ThreadQuerySync isMessages={routeTab?.id === 'messages'} onChange={setUrlThreadOpenStable} />
      </React.Suspense>
      <MessagesThreadChromeProvider setThreadUiOpen={setThreadOpen}>
        {routeTab?.id !== 'home' ? (
          <Box sx={{ display: 'none' }} aria-hidden>
            {children}
          </Box>
        ) : null}
        <Box
          ref={viewportRef}
          sx={{
            height: '100dvh',
            overflow: 'hidden',
            touchAction: 'pan-y',
            overscrollBehaviorX: 'none',
            bgcolor: 'background.default',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              width: `${MAIN_TAB_COUNT * 100}%`,
              height: '100%',
              transform: translate,
              transition: dragging ? 'none' : `transform 280ms ${MOTION.ease}`,
              willChange: 'transform',
            }}
          >
            <Box
              ref={setPaneRef(0)}
              sx={paneSx}
            >
              {routeTab?.id === 'home' ? children : <MainTabsHomePreview />}
            </Box>
            <Box
              ref={setPaneRef(1)}
              sx={{ ...paneSx, px: 2, pt: 3, pb: MOBILE_CONTENT_BOTTOM_PADDING }}
            >
              {shouldMountPane(1, index, visited) ? (
                authed ? (
                  <SavedListingsView />
                ) : (
                  <MainTabsGuestPane title={t.chrome.navSaved} />
                )
              ) : null}
            </Box>
            <Box
              ref={setPaneRef(2)}
              sx={{
                ...paneSx,
                display: 'flex',
                flexDirection: 'column',
                pb: threadOpen ? 0 : MOBILE_CONTENT_BOTTOM_PADDING,
              }}
            >
              {shouldMountPane(2, index, visited) ? (
                authed ? (
                  <UserMessagesView />
                ) : (
                  <MainTabsGuestPane title={t.chrome.navMessages} />
                )
              ) : null}
            </Box>
            <Box
              ref={setPaneRef(3)}
              sx={{ ...paneSx, px: 2, pt: 3, pb: MOBILE_CONTENT_BOTTOM_PADDING }}
            >
              {shouldMountPane(3, index, visited) ? (
                authed ? (
                  <React.Suspense fallback={null}>
                    <UserDashboardHome />
                  </React.Suspense>
                ) : (
                  <MainTabsGuestPane title={t.chrome.navProfile} />
                )
              ) : null}
            </Box>
          </Box>
        </Box>
        {pagerActive ? <MobileBottomNav /> : null}
      </MessagesThreadChromeProvider>
    </MainTabsContext.Provider>
  );
}
