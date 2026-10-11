/**
 * Shared motion for the mobile Home / Saves / Search / Messages / Profile pager.
 *
 * The track writes `transform` on the DOM node (no React per touchmove). Tab clicks call
 * `previewMainTabIndex` in the same turn so the slide starts before the route
 * update.
 */

export const MAIN_TAB_SLIDE_MS = 380;

type PreviewFn = (index: number, animate: boolean) => void;
/** Fractional tab index while the pager is dragging or settling. `1.4` is 40% from Saves toward Search. */
type NavProgressFn = (fractionalIndex: number, animate: boolean) => void;

let previewFn: PreviewFn | null = null;
let navProgressFn: NavProgressFn | null = null;

export function registerMainTabPagerPreview(fn: PreviewFn | null): void {
  previewFn = fn;
}

export function previewMainTabIndex(index: number, animate = true): void {
  previewFn?.(index, animate);
}

export function registerMainTabNavProgress(fn: NavProgressFn | null): void {
  navProgressFn = fn;
}

/** Keeps the bottom-nav pill on the same position as the sliding pages. */
export function publishMainTabNavProgress(fractionalIndex: number, animate: boolean): void {
  navProgressFn?.(fractionalIndex, animate);
}
