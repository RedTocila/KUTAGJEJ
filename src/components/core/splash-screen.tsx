'use client';

import * as React from 'react';

import { brandLogoSrc, config } from '@/config';

const MIN_VISIBLE_MS = 420;
const MAX_WAIT_MS = 1800;
const FADE_MS = 280;

/**
 * Cold-start branded overlay. Fully React-owned (do not inject/remove
 * sibling DOM under `<body>` — that breaks Next.js hydration with insertBefore).
 */
export function SplashScreen(): React.JSX.Element | null {
  const [phase, setPhase] = React.useState<'show' | 'hiding' | 'gone'>('show');

  React.useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const started = performance.now();
    let finished = false;
    let fadeTimer = 0;
    let goneTimer = 0;
    let maxTimer = 0;

    const dismiss = () => {
      if (finished) return;
      finished = true;

      const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - started));

      fadeTimer = window.setTimeout(() => {
        if (reduceMotion) {
          setPhase('gone');
          return;
        }
        setPhase('hiding');
        goneTimer = window.setTimeout(() => setPhase('gone'), FADE_MS);
      }, wait);
    };

    if (document.readyState === 'complete') {
      dismiss();
    } else {
      window.addEventListener('load', dismiss, { once: true });
    }

    maxTimer = window.setTimeout(dismiss, MAX_WAIT_MS);

    return () => {
      window.removeEventListener('load', dismiss);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(goneTimer);
      window.clearTimeout(maxTimer);
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div
      className={phase === 'hiding' ? 'kutagjej-splash kutagjej-splash--hide' : 'kutagjej-splash'}
      role="status"
      aria-live="polite"
      aria-label="Duke u ngarkuar"
      aria-hidden={phase === 'hiding'}
    >
      <div className="kutagjej-splash__inner">
        {/* eslint-disable-next-line @next/next/no-img-element -- splash mark before image optimizer is needed */}
        <img
          className="kutagjej-splash__logo"
          src={brandLogoSrc}
          alt={config.site.name}
          width={168}
          height={168}
          decoding="async"
          fetchPriority="high"
        />
        <div className="kutagjej-splash__bar" aria-hidden />
      </div>
    </div>
  );
}
