'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Box, type SxProps, type Theme } from '@mui/material';

import { MainTabsGuestPane } from '@/components/main-tabs/main-tabs-guest-pane';
import { MainTabsHomePreview } from '@/components/main-tabs/main-tabs-home-preview';
import { MobileBottomNav } from '@/components/public/mobile-bottom-nav';
import { SavedListingsView } from '@/components/user/saved-listings-view';
import { UserMessagesView } from '@/components/user/messages/user-messages-view';
import { MessagesThreadChromeProvider } from '@/contexts/messages-thread-chrome-context';
import { useOptionalSearchOverlay } from '@/contexts/search-overlay-context';
import { useCopy } from '@/hooks/use-copy';
import { useDisplayPathname } from '@/hooks/use-navigation-pending';
import { useRegisterTabRefresh } from '@/hooks/use-tab-refresh';
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
import { MAIN_TAB_SLIDE_MS, registerMainTabPagerPreview } from '@/lib/main-tab-pager';
import { MOBILE_CONTENT_BOTTOM_PADDING } from '@/lib/mobile-layout';
import { beginPendingNavigation } from '@/lib/navigation-pending';
import { setActiveTabForRefresh, subscribeTabRefresh } from '@/lib/tab-refresh';
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
  let depth = 0;
  while (el instanceof HTMLElement && depth < 10) {
    if (el.hasAttribute('data-main-tab-pane')) break;
    const style = window.getComputedStyle(el);
    if (
      (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
      el.scrollWidth > el.clientWidth + 12
    ) {
      return true;
    }
    el = el.parentElement;
    depth += 1;
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

function HomeTabSoftRefresh() {
  const router = useRouter();
  useRegisterTabRefresh('home', () => {
    router.refresh();
  });
  return null;
}

function MainTabPane({
  paneIndex,
  active,
  layoutActive,
  fill,
  contentSx,
  onPaneRef,
  children,
}: {
  paneIndex: number;
  active: boolean;
  /** Height/overflow target. Lagged until the slide settles so layout does not hitch mid-animation. */
  layoutActive: boolean;
  fill?: boolean;
  contentSx?: SxProps<Theme>;
  onPaneRef: (paneIndex: number) => (node: unknown) => void;
  children: React.ReactNode;
}) {
  return (
    <Box
      ref={onPaneRef(paneIndex)}
      data-main-tab-pane=""
      data-tab-scroll={fill ? 'pane' : 'page'}
      aria-hidden={!active}
      sx={{
        width: `${100 / MAIN_TAB_COUNT}%`,
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overscrollBehaviorX: 'none',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        pointerEvents: active ? 'auto' : 'none',
        ...(fill
          ? {
              height: '100dvh',
              overflowX: 'hidden',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }
          : layoutActive
            ? {
                height: 'auto',
                overflow: 'visible',
                alignSelf: 'flex-start',
                '& [data-tab-inner-scroll]': {
                  overflow: 'visible !important',
                  height: 'auto',
                  maxHeight: 'none',
                  flex: '0 0 auto',
                  minHeight: 0,
                },
              }
            : {
                height: '100dvh',
                overflow: 'hidden',
                alignSelf: 'flex-start',
              }),
      }}
    >
      <Box
        sx={[
          fill
            ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }
            : { flex: '0 0 auto', width: '100%' },
          ...(Array.isArray(contentSx) ? contentSx : contentSx ? [contentSx] : []),
        ]}
      >
        {children}
      </Box>
    </Box>
  );
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
  const trackRef = React.useRef<HTMLDivElement | null>(null);
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
  const draggingRef = React.useRef(false);
  const appliedIndexRef = React.useRef(index);
  const reduceMotionRef = React.useRef(false);
  const [layoutIndex, setLayoutIndex] = React.useState(index);
  const startRef = React.useRef<{
    x: number;
    y: number;
    t: number;
    locked: boolean | null;
    blocked: boolean;
  } | null>(null);

  const applyTransform = React.useCallback((tabIndex: number, offsetPx: number, withTransition: boolean) => {
    const el = trackRef.current;
    if (!el) return;
    const animate = withTransition && !reduceMotionRef.current;
    el.style.transition = animate ? `transform ${MAIN_TAB_SLIDE_MS}ms ${MOTION.ease}` : 'none';
    el.style.transform = `translate3d(calc(${(-tabIndex * 100) / MAIN_TAB_COUNT}% + ${offsetPx}px), 0, 0)`;
    if (offsetPx === 0) appliedIndexRef.current = tabIndex;
  }, []);

  const setTrackRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      trackRef.current = node;
      if (node && !draggingRef.current) {
        applyTransform(indexRef.current, 0, false);
      }
    },
    [applyTransform],
  );

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
    if (!hosted || pagerActive) {
      setScrollParent(null);
      return;
    }
    setScrollParent(paneRefs.current[index] ?? null);
  }, [hosted, index, pagerActive]);

  React.useEffect(() => {
    setActiveTabForRefresh(displayTab?.id ?? null);
    return () => {
      setActiveTabForRefresh(null);
    };
  }, [displayTab?.id]);

  React.useEffect(() => {
    if (!hosted || !displayTab) return;
    return subscribeTabRefresh(displayTab.id, () => {
      window.scrollTo(0, 0);
      paneRefs.current[displayTab.index]?.scrollTo({ top: 0 });
    });
  }, [displayTab, hosted]);

  React.useEffect(() => {
    if (!pagerActive) return;
    window.scrollTo(0, 0);
    const pane = paneRefs.current[index];
    if (pane) pane.scrollTop = 0;
  }, [index, pagerActive]);

  React.useEffect(() => {
    if (!hosted || !threadOpen) return;
    window.scrollTo(0, 0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [hosted, threadOpen]);

  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      reduceMotionRef.current = mq.matches;
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  React.useEffect(() => {
    registerMainTabPagerPreview((nextIndex, animate) => {
      if (draggingRef.current) return;
      if (appliedIndexRef.current === nextIndex && dragXRef.current === 0) return;
      dragXRef.current = 0;
      applyTransform(nextIndex, 0, animate);
      if (!animate || reduceMotionRef.current) setLayoutIndex(nextIndex);
    });
    return () => {
      registerMainTabPagerPreview(null);
    };
  }, [applyTransform]);

  React.useLayoutEffect(() => {
    if (!hosted || draggingRef.current) return;
    if (appliedIndexRef.current === index && dragXRef.current === 0) return;
    dragXRef.current = 0;
    applyTransform(index, 0, true);
  }, [applyTransform, hosted, index]);

  React.useLayoutEffect(() => {
    if (reduceMotionRef.current || !hosted) {
      setLayoutIndex(index);
    }
  }, [hosted, index]);

  React.useEffect(() => {
    if (layoutIndex === index) return undefined;
    const fallback = window.setTimeout(() => setLayoutIndex(index), MAIN_TAB_SLIDE_MS * 2);
    return () => window.clearTimeout(fallback);
  }, [index, layoutIndex]);

  React.useEffect(() => {
    if (!hosted) return;
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const warm = () => setVisited(new Set([0, 1, 2, 3]));
    if (typeof win.requestIdleCallback === 'function') {
      const id = win.requestIdleCallback(warm, { timeout: 900 });
      return () => win.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(warm, 400);
    return () => window.clearTimeout(timer);
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
        draggingRef.current = true;
        applyTransform(appliedIndexRef.current, 0, false);
      }
      if (!start.locked) return;
      event.preventDefault();
      const width = el.clientWidth || window.innerWidth;
      const current = appliedIndexRef.current;
      let next = dx;
      if (current <= 0 && next > 0) next *= 0.35;
      if (current >= MAIN_TAB_COUNT - 1 && next < 0) next *= 0.35;
      next = Math.max(-width, Math.min(width, next));
      dragXRef.current = next;
      applyTransform(current, next, false);
    };

    const settleTo = (tabIndex: number, navigate: boolean) => {
      draggingRef.current = false;
      dragXRef.current = 0;
      applyTransform(tabIndex, 0, true);
      if (navigate && tabIndex !== indexRef.current) {
        // Let the first settle frames paint before route/React work.
        window.requestAnimationFrame(() => goToIndex(tabIndex));
      }
    };

    const onEnd = () => {
      const start = startRef.current;
      startRef.current = null;
      const dx = dragXRef.current;
      if (!start || start.blocked || start.locked !== true) {
        if (draggingRef.current) settleTo(indexRef.current, false);
        return;
      }
      const width = el.clientWidth || window.innerWidth;
      const dt = Math.max(1, Date.now() - start.t);
      const vx = dx / dt;
      const commit = Math.abs(dx) > width * 0.2 || Math.abs(vx) > 0.45;
      if (commit) {
        settleTo(clampMainTabIndex(dx < 0 ? indexRef.current + 1 : indexRef.current - 1), true);
        return;
      }
      settleTo(indexRef.current, false);
    };

    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== trackRef.current || event.propertyName !== 'transform') return;
      if (draggingRef.current) return;
      setLayoutIndex(appliedIndexRef.current);
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    const track = trackRef.current;
    track?.addEventListener('transitionend', onTransitionEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
      track?.removeEventListener('transitionend', onTransitionEnd);
    };
  }, [applyTransform, goToIndex, pagerActive, searchOverlay?.open, threadOpen]);

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
            width: '100%',
            maxWidth: '100%',
            minHeight: '100dvh',
            touchAction: 'pan-y',
            overscrollBehaviorX: 'none',
            bgcolor: 'background.default',
            ...(threadOpen
              ? {
                  height: '100dvh',
                  overflow: 'hidden',
                }
              : {
                  // Clip the 4-pane-wide track without creating a vertical scroller
                  // (`overflow-x` alone would compute overflow-y to `auto`).
                  height: 'auto',
                  overflow: 'clip',
                }),
          }}
        >
          <Box
            ref={setTrackRef}
            sx={{
              display: 'flex',
              width: `${MAIN_TAB_COUNT * 100}%`,
              minHeight: threadOpen ? '100%' : '100dvh',
              height: threadOpen ? '100%' : 'auto',
              alignItems: 'flex-start',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            <MainTabPane
              paneIndex={0}
              active={index === 0}
              layoutActive={layoutIndex === 0}
              onPaneRef={setPaneRef}
            >
              <HomeTabSoftRefresh />
              {routeTab?.id === 'home' ? children : <MainTabsHomePreview />}
            </MainTabPane>
            <MainTabPane
              paneIndex={1}
              active={index === 1}
              layoutActive={layoutIndex === 1}
              contentSx={{ px: 2, pt: 3, pb: MOBILE_CONTENT_BOTTOM_PADDING }}
              onPaneRef={setPaneRef}
            >
              {shouldMountPane(1, index, visited) ? (
                authed ? (
                  <SavedListingsView />
                ) : (
                  <MainTabsGuestPane title={t.chrome.navSaved} />
                )
              ) : null}
            </MainTabPane>
            <MainTabPane
              paneIndex={2}
              active={index === 2}
              layoutActive={layoutIndex === 2}
              fill
              contentSx={{ pb: threadOpen ? 0 : MOBILE_CONTENT_BOTTOM_PADDING }}
              onPaneRef={setPaneRef}
            >
              {shouldMountPane(2, index, visited) ? (
                authed ? (
                  <UserMessagesView />
                ) : (
                  <MainTabsGuestPane title={t.chrome.navMessages} />
                )
              ) : null}
            </MainTabPane>
            <MainTabPane
              paneIndex={3}
              active={index === 3}
              layoutActive={layoutIndex === 3}
              contentSx={{ px: 2, pt: 3, pb: MOBILE_CONTENT_BOTTOM_PADDING }}
              onPaneRef={setPaneRef}
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
            </MainTabPane>
          </Box>
        </Box>
        {pagerActive ? <MobileBottomNav /> : null}
      </MessagesThreadChromeProvider>
    </MainTabsContext.Provider>
  );
}
