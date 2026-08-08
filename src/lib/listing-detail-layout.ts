/** Shared max width for listing detail page content (`md+`) — matches MUI `maxWidth="lg"`. */
export const LISTING_DETAIL_PAGE_MAX_WIDTH_PX = 1200;

/** Max width of the photo hero on public listing detail pages (`md+`). */
export const LISTING_DETAIL_HERO_GALLERY_MAX_WIDTH_PX = 840;

/** `sizes` for next/image hero when the gallery is capped — keeps srcset aligned with layout. */
export const LISTING_DETAIL_HERO_IMAGE_SIZES = `(max-width: 899px) 100vw, min(${LISTING_DETAIL_HERO_GALLERY_MAX_WIDTH_PX}px, calc(${LISTING_DETAIL_PAGE_MAX_WIDTH_PX}px - 360px))`;

/** Sticky sidebar offset on desktop listing detail pages. */
export const LISTING_DETAIL_STICKY_TOP_MD = '20px';

/** Mobile `h1` below gallery — matches biznese / njoftime pune / profesionistë detail pages. */
export const LISTING_DETAIL_MOBILE_HEADING_FONT_SIZE = '1.375rem';
