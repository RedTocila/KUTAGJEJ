import * as React from 'react';

import { brandSplashSrc, config } from '@/config';

type BrandLoadingScreenProps = {
  /** `reveal` fills once (cold start). `pending` keeps sweeping until the page is ready. */
  mode?: 'reveal' | 'pending';
  hiding?: boolean;
  /** Soft fade-in when covering a page that is already on screen. */
  enter?: boolean;
  pendingOverlay?: boolean;
};

/**
 * Full-viewport KuTaGjej artwork with a glowing bar.
 * Cold start fills the bar, then the splash fades and reveals the page.
 * Route loads keep the bar moving until content is ready.
 */
export function BrandLoadingScreen({
  mode = 'pending',
  hiding = false,
  enter = false,
  pendingOverlay = false,
}: BrandLoadingScreenProps): React.JSX.Element {
  const className = [
    'kutagjej-splash',
    hiding ? 'kutagjej-splash--hide' : '',
    enter ? 'kutagjej-splash--enter' : '',
  ]
    .filter(Boolean)
    .join(' ');

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
      {/* eslint-disable-next-line @next/next/no-img-element -- paint before the image optimizer */}
      <img
        className="kutagjej-splash__art"
        src={brandSplashSrc}
        alt=""
        width={471}
        height={1024}
        decoding="async"
        fetchPriority="high"
      />
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
