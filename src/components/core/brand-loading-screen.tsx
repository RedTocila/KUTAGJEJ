'use client';

import * as React from 'react';

import { brandLogoSrc, config } from '@/config';

/**
 * Several covers can be mounted at once (cold-start splash + a route loader).
 * Only the first one locks the document; the last one to leave unlocks it.
 */
let scrollLocks = 0;
let releaseScrollLock: (() => void) | null = null;

function acquireScrollLock(): () => void {
  scrollLocks += 1;
  if (scrollLocks === 1) {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlTouch: html.style.touchAction,
      bodyTouch: body.style.touchAction,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
    };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.touchAction = 'none';
    body.style.touchAction = 'none';
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';

    const blockGesture = (event: Event) => {
      event.preventDefault();
    };
    document.addEventListener('touchmove', blockGesture, { capture: true, passive: false });
    document.addEventListener('wheel', blockGesture, { capture: true, passive: false });

    releaseScrollLock = () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.touchAction = prev.htmlTouch;
      body.style.touchAction = prev.bodyTouch;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overscrollBehavior = prev.bodyOverscroll;
      document.removeEventListener('touchmove', blockGesture, { capture: true });
      document.removeEventListener('wheel', blockGesture, { capture: true });
      releaseScrollLock = null;
    };
  }

  return () => {
    scrollLocks = Math.max(0, scrollLocks - 1);
    if (scrollLocks === 0) releaseScrollLock?.();
  };
}

function useSplashScrollLock(): void {
  React.useEffect(() => acquireScrollLock(), []);
}

type BrandLoadingScreenProps = {
  /** `reveal` fills once (cold start). `pending` keeps sweeping until the page is ready. */
  mode?: 'reveal' | 'pending';
  hiding?: boolean;
  /** Soft fade-in when covering a page that is already on screen. */
  enter?: boolean;
  pendingOverlay?: boolean;
};

/**
 * Solid launch cover: small mark, wordmark, thin progress line.
 * Cold start fills the line, then the splash fades and reveals the page.
 * Route loads keep the line moving until content is ready.
 */
export function BrandLoadingScreen({
  mode = 'pending',
  hiding = false,
  enter = false,
  pendingOverlay = false,
}: BrandLoadingScreenProps): React.JSX.Element {
  useSplashScrollLock();
  const className = [
    'kutagjej-splash',
    hiding ? 'kutagjej-splash--hide' : '',
    enter ? 'kutagjej-splash--enter' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const [lead, accent] = config.site.wordmarkSegments ?? [config.site.name, ''];

  return (
    <div
      className={className}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={`${config.site.name} — duke u ngarkuar`}
      aria-hidden={hiding || undefined}
      {...(pendingOverlay ? { 'data-nav-pending-overlay': '' } : {})}
    >
      <div className="kutagjej-splash__mark">
        <img className="kutagjej-splash__logo" src={brandLogoSrc} alt="" width={104} height={104} decoding="async" />
        <p className="kutagjej-splash__title">
          {lead}
          {accent ? <span className="kutagjej-splash__title-accent">{accent}</span> : null}
        </p>
      </div>
      <div className="kutagjej-splash__progress" aria-hidden="true">
        <span
          className={
            mode === 'reveal'
              ? 'kutagjej-splash__progress-fill'
              : 'kutagjej-splash__progress-fill kutagjej-splash__progress-fill--pending'
          }
        />
      </div>
    </div>
  );
}
