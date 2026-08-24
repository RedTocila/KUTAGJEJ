/** Native input inside the listing AI drawer — focused after the sheet opens. */
export const POST_LISTING_AI_INPUT_ID = 'post-listing-ai-assist-input';

/** Trigger button for the listing AI drawer (used as a fallback scroll target). */
export const POST_LISTING_AI_BAR_ID = 'post-listing-ai-assist';

/** Opens `PostListingAiAssist` from description-field sparkle buttons. */
export const POST_LISTING_AI_OPEN_EVENT = 'kutagjej:open-post-listing-ai-assist';

function focusAiInput() {
  const el = document.getElementById(POST_LISTING_AI_INPUT_ID);
  if (!(el instanceof HTMLTextAreaElement) && !(el instanceof HTMLInputElement)) return;

  el.focus({ preventScroll: true });
  const len = el.value.length;
  try {
    el.setSelectionRange(len, len);
  } catch {
    /* some input types reject setSelectionRange */
  }
}

/**
 * Opens the listing AI drawer and focuses the input so the mobile keyboard opens.
 * Must stay synchronous (called from a click handler) — iOS will not open the
 * keyboard after an `await` or a delayed focus.
 */
export function focusPostListingAiAssist() {
  window.dispatchEvent(new Event(POST_LISTING_AI_OPEN_EVENT));
  focusAiInput();
}
