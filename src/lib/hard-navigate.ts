/**
 * Full document navigation — bypasses Next.js App Router soft-nav / RSC.
 * Soft navigation is currently unreliable on this app (Next 16.2 + dynamic layouts),
 * and failed soft-navs surface the global 404 page even when the route exists.
 */
export function hardNavigate(href: string, event?: { preventDefault(): void }): void {
  event?.preventDefault();
  if (typeof window === 'undefined') return;
  window.location.assign(href);
}
