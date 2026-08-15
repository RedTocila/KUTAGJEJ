/** Native input inside `PostListingAiAssist` — focused from description AI buttons. */
export const POST_LISTING_AI_INPUT_ID = 'post-listing-ai-assist-input';

/** Wrapper around the top AI command bar (used for scroll-into-view). */
export const POST_LISTING_AI_BAR_ID = 'post-listing-ai-assist';

/**
 * Scrolls the listing AI bar into view and focuses it so the mobile keyboard opens.
 * Must stay synchronous (called from a click handler) — iOS will not open the
 * keyboard after an `await` or a delayed focus.
 */
export function focusPostListingAiAssist() {
  const el = document.getElementById(POST_LISTING_AI_INPUT_ID);
  if (!(el instanceof HTMLTextAreaElement) && !(el instanceof HTMLInputElement)) return;

  const bar = document.getElementById(POST_LISTING_AI_BAR_ID);
  (bar ?? el).scrollIntoView({ behavior: 'auto', block: 'start' });
  el.focus({ preventScroll: true });
  const len = el.value.length;
  try {
    el.setSelectionRange(len, len);
  } catch {
    /* some input types reject setSelectionRange */
  }
}
