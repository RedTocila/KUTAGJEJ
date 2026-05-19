/** Visible height of `MobileBottomNav` icon row (excludes home-indicator safe area). */
export const MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX = 56;

/** Distance from viewport bottom to stack a bar flush above the mobile nav. */
export const MOBILE_BOTTOM_NAV_OFFSET = `calc(${MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px))`;
