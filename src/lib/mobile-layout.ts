/** Visible height of `MobileBottomNav` pill / search circle (excludes float inset + home indicator). */
export const MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX = 56;

/** Gap between the floating nav and the viewport bottom edge. */
export const MOBILE_BOTTOM_NAV_FLOAT_INSET_PX = 8;

/** Extra space so scroll content doesn’t sit flush against the nav. */
export const MOBILE_BOTTOM_NAV_CONTENT_GAP_PX = 20;

/** Distance from viewport bottom to stack a bar flush above the mobile nav. */
export const MOBILE_BOTTOM_NAV_OFFSET = `calc(${MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX}px + ${MOBILE_BOTTOM_NAV_FLOAT_INSET_PX}px + env(safe-area-inset-bottom, 0px))`;

/** Scroll/content padding so the last item clears the nav with a visible gap. */
export const MOBILE_CONTENT_BOTTOM_PADDING = `calc(${MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX}px + ${MOBILE_BOTTOM_NAV_FLOAT_INSET_PX}px + ${MOBILE_BOTTOM_NAV_CONTENT_GAP_PX}px + env(safe-area-inset-bottom, 0px))`;

/** Extra space under the /kerko search bar so it isn’t flush with the home indicator. */
export const MOBILE_SEARCH_DOCK_BOTTOM_PADDING_PX = 16;

/** Category circles + labels stacked above the /kerko search bar (replaces the nav). */
export const MOBILE_SEARCH_CATEGORY_ROW_PX = 100;

/** Content padding so /kerko results clear categories + the search bar. */
export const MOBILE_SEARCH_DOCK_PADDING = `calc(${MOBILE_SEARCH_CATEGORY_ROW_PX}px + ${MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX}px + ${MOBILE_SEARCH_DOCK_BOTTOM_PADDING_PX}px + ${MOBILE_BOTTOM_NAV_FLOAT_INSET_PX}px + ${MOBILE_BOTTOM_NAV_CONTENT_GAP_PX}px + env(safe-area-inset-bottom, 0px))`;
