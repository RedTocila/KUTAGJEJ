import type { MainTabId } from '@/lib/main-tabs';

type TabRefreshHandler = () => void | Promise<void>;

const handlers = new Map<MainTabId, Set<TabRefreshHandler>>();
/** Refetchers for screens that are not a main tab (category browse, and similar). */
const pageHandlers = new Set<TabRefreshHandler>();
let activeTab: MainTabId | null = null;

export function setActiveTabForRefresh(tab: MainTabId | null): void {
  activeTab = tab;
}

export function getActiveTabForRefresh(): MainTabId | null {
  return activeTab;
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

export function subscribePageRefresh(handler: TabRefreshHandler): () => void {
  pageHandlers.add(handler);
  return () => {
    pageHandlers.delete(handler);
  };
}

async function runHandlers(set: Set<TabRefreshHandler> | undefined): Promise<void> {
  if (!set || set.size === 0) return;
  await Promise.all(Array.from(set, (handler) => Promise.resolve().then(handler)));
}

export async function runTabRefresh(tab: MainTabId): Promise<void> {
  await runHandlers(handlers.get(tab));
}

export async function runActiveTabRefresh(): Promise<void> {
  if (activeTab) {
    await runTabRefresh(activeTab);
    return;
  }
  await runHandlers(pageHandlers);
}
