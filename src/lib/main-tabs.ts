import { paths } from '@/paths';
import { normalizeNavPath } from '@/lib/navigation-pending';

export const MAIN_TAB_IDS = ['home', 'saved', 'messages', 'profile'] as const;

export type MainTabId = (typeof MAIN_TAB_IDS)[number];

export type MainTab = {
  id: MainTabId;
  href: string;
  index: number;
};

export const MAIN_TABS: readonly MainTab[] = [
  { id: 'home', href: paths.home, index: 0 },
  { id: 'saved', href: paths.user.savedListings, index: 1 },
  { id: 'messages', href: paths.user.messages, index: 2 },
  { id: 'profile', href: paths.user.dashboard, index: 3 },
] as const;

const TAB_COUNT = MAIN_TABS.length;

export function mainTabFromPath(pathname: string | null | undefined): MainTab | null {
  const path = normalizeNavPath(pathname || '/');
  if (path === paths.home) return MAIN_TABS[0]!;
  if (path === paths.user.savedListings) return MAIN_TABS[1]!;
  if (path === paths.user.messages) return MAIN_TABS[2]!;
  if (path === paths.user.dashboard) return MAIN_TABS[3]!;
  return null;
}

export function mainTabByIndex(index: number): MainTab | null {
  if (index < 0 || index >= TAB_COUNT) return null;
  return MAIN_TABS[index] ?? null;
}

export function clampMainTabIndex(index: number): number {
  if (index < 0) return 0;
  if (index >= TAB_COUNT) return TAB_COUNT - 1;
  return index;
}

export const MAIN_TAB_COUNT = TAB_COUNT;

/** MUI `lg` starts at 1200px — same breakpoint as the floating bottom nav. */
export const MAIN_TABS_MOBILE_MQ = '(max-width: 1199.95px)';
