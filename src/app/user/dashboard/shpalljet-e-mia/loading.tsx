/**
 * Prefer an empty fallback over the dashboard spinner so soft-nav to My listings
 * does not flash a blank loader — the page paints its own card skeletons on mount.
 */
export default function Loading() {
  return null;
}
