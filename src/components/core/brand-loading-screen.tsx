import * as React from 'react';

import { brandLogoSrc, config } from '@/config';

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
