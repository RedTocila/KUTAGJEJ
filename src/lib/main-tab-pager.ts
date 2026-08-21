/**
 * Shared motion for the mobile Home / Saves / Messages / Profile pager.
 *
 * The track writes `transform` on the DOM node (no React per touchmove).
 * Tab clicks call `previewMainTabIndex` in the same turn so the slide starts
 * before the route update.
 */

export const MAIN_TAB_SLIDE_MS = 260;

type PreviewFn = (index: number, animate: boolean) => void;

let previewFn: PreviewFn | null = null;

export function registerMainTabPagerPreview(fn: PreviewFn | null): void {
  previewFn = fn;
}

export function previewMainTabIndex(index: number, animate = true): void {
  previewFn?.(index, animate);
}
