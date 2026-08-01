/** Visible height of `MobileBottomNav` icon row (excludes home-indicator safe area). */
export const MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX = 56;

/** Extra space so scroll content doesn’t sit flush against the nav. */
export const MOBILE_BOTTOM_NAV_CONTENT_GAP_PX = 20;

/** Distance from viewport bottom to stack a bar flush above the mobile nav. */
export const MOBILE_BOTTOM_NAV_OFFSET = `calc(${MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px))`;

/** Scroll/content padding so the last item clears the nav with a visible gap. */
export const MOBILE_CONTENT_BOTTOM_PADDING = `calc(${MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX}px + ${MOBILE_BOTTOM_NAV_CONTENT_GAP_PX}px + env(safe-area-inset-bottom, 0px))`;
