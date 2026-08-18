'use client';

import * as React from 'react';

import { brandLogoSrc, config } from '@/config';

const HOLD_MS = 520;
const FADE_MS = 220;

const wordmarkSegments =
  config.site.wordmarkSegments && config.site.wordmarkSegments[0] + config.site.wordmarkSegments[1] === config.site.name
    ? config.site.wordmarkSegments
    : null;

/**
 * Cold-start branded overlay. Holds just long enough for the lockup to land,
 * then fades. Fully React-owned (do not inject/remove sibling DOM under `<body>`).
 */
export function SplashScreen(): React.JSX.Element | null {
  const [phase, setPhase] = React.useState<'show' | 'hiding' | 'gone'>('show');

  React.useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setPhase('gone');
      return;
    }

    const fadeTimer = window.setTimeout(() => setPhase('hiding'), HOLD_MS);
    const goneTimer = window.setTimeout(() => setPhase('gone'), HOLD_MS + FADE_MS);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(goneTimer);
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div
      className={phase === 'hiding' ? 'kutagjej-splash kutagjej-splash--hide' : 'kutagjej-splash'}
      role="status"
      aria-live="polite"
      aria-label={`${config.site.name} — duke u ngarkuar`}
      aria-hidden={phase === 'hiding'}
    >
      <div className="kutagjej-splash__inner">
        <div className="kutagjej-splash__mark">
          {/* eslint-disable-next-line @next/next/no-img-element -- splash mark before image optimizer is needed */}
          <img
            className="kutagjej-splash__logo"
            src={brandLogoSrc}
            alt=""
            width={140}
            height={140}
            decoding="async"
            fetchPriority="low"
          />
        </div>
        <p className="kutagjej-splash__wordmark">
          {wordmarkSegments ? (
            <>
              <span className="kutagjej-splash__wordmark-muted">{wordmarkSegments[0]}</span>
              <span className="kutagjej-splash__wordmark-brand">{wordmarkSegments[1]}</span>
            </>
          ) : (
            <span className="kutagjej-splash__wordmark-brand">{config.site.name}</span>
          )}
        </p>
        <div className="kutagjej-splash__progress" aria-hidden>
          <span className="kutagjej-splash__progress-fill" />
        </div>
      </div>
    </div>
  );
}
