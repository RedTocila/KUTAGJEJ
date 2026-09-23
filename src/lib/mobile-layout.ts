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

/** Matches dashboard `HeaderSearchBar` height. */
export const MOBILE_SEARCH_BAR_HEIGHT_PX = 42;

/** Dock padding-top above the search bar (`pt` + safe area handled separately). */
export const MOBILE_SEARCH_DOCK_TOP_PADDING_PX = 10;

/** Gap between the search bar and category circles (`gap: 1.5`). */
export const MOBILE_SEARCH_DOCK_GAP_PX = 12;

/** Category circles + labels stacked in the /kerko top dock. */
export const MOBILE_SEARCH_CATEGORY_ROW_PX = 120;

/** Content padding so /kerko results clear the top search bar when categories are hidden. */
export const MOBILE_SEARCH_TOP_BAR_PADDING = `calc(env(safe-area-inset-top, 0px) + ${MOBILE_SEARCH_BAR_HEIGHT_PX}px + ${MOBILE_SEARCH_DOCK_TOP_PADDING_PX}px)`;

/** Content padding so /kerko results clear the search bar + categories at the top. */
export const MOBILE_SEARCH_TOP_DOCK_PADDING = `calc(env(safe-area-inset-top, 0px) + ${MOBILE_SEARCH_DOCK_TOP_PADDING_PX}px + ${MOBILE_SEARCH_BAR_HEIGHT_PX}px + ${MOBILE_SEARCH_DOCK_GAP_PX}px + ${MOBILE_SEARCH_CATEGORY_ROW_PX}px)`;
