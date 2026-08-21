import type { MainTabId } from '@/lib/main-tabs';

type TabRefreshHandler = () => void | Promise<void>;

const handlers = new Map<MainTabId, Set<TabRefreshHandler>>();
let activeTab: MainTabId | null = null;

export function setActiveTabForRefresh(tab: MainTabId | null): void {
  activeTab = tab;
}

export function subscribeTabRefresh(tab: MainTabId, handler: TabRefreshHandler): () => void {
  let set = handlers.get(tab);
  if (!set) {
    set = new Set();
    handlers.set(tab, set);
  }
  set.add(handler);
  return () => {
    set?.delete(handler);
    if (set && set.size === 0) handlers.delete(tab);
  };
}

export async function runTabRefresh(tab: MainTabId): Promise<void> {
  const set = handlers.get(tab);
  if (!set || set.size === 0) return;
  await Promise.all(Array.from(set, (handler) => Promise.resolve().then(handler)));
}

export async function runActiveTabRefresh(): Promise<void> {
  if (!activeTab) return;
  await runTabRefresh(activeTab);
}
