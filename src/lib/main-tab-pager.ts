/**
 * Shared motion for the mobile Home / Saves / Messages / Profile pager.
 *
 * Matched to the home banner slider (`useBannerSlider` / 320ms + MOTION.ease)
 * so tab slides settle at the same visual speed. The track writes `transform`
 * on the DOM node (no React per touchmove). Tab clicks call
 * `previewMainTabIndex` in the same turn so the slide starts before the route
 * update.
 */

export const MAIN_TAB_SLIDE_MS = 320;

type PreviewFn = (index: number, animate: boolean) => void;

let previewFn: PreviewFn | null = null;

export function registerMainTabPagerPreview(fn: PreviewFn | null): void {
  previewFn = fn;
}

export function previewMainTabIndex(index: number, animate = true): void {
  previewFn?.(index, animate);
}
