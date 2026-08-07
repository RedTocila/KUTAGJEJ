/**
 * Prefer an empty fallback over the dashboard spinner so soft-nav to Chats
 * does not flash a blank loader — the page paints from cache on mount.
 */
export default function Loading() {
  return null;
}
