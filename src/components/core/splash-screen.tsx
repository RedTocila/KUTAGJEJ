'use client';

import * as React from 'react';

import { isPendingHomeDashboardRedirect } from '@/components/auth/signed-in-home-redirect';
import { brandLogoSrc, config } from '@/config';
import { hasStoredAccessToken } from '@/lib/auth/storage';
import { isColdSessionStart } from '@/lib/navigate-back';
import { paths } from '@/paths';

const FADE_MS = 180;

function shouldHoldForDashboardRedirect(): boolean {
  if (typeof window === 'undefined') return false;
  if (isPendingHomeDashboardRedirect()) return true;
  return window.location.pathname === paths.home && isColdSessionStart() && hasStoredAccessToken();
}

/**
 * Cold-start branded overlay. Dismisses as soon as React hydrates so it does
 * not hold the first paint for a minimum time or wait on images (`window.load`).
 * Fully React-owned (do not inject/remove sibling DOM under `<body>`).
 */
export function SplashScreen(): React.JSX.Element | null {
  const [phase, setPhase] = React.useState<'show' | 'hiding' | 'gone'>('show');

  React.useEffect(() => {
    if (shouldHoldForDashboardRedirect()) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setPhase('gone');
      return;
    }

    const fadeTimer = window.setTimeout(() => setPhase('hiding'), 0);
    const goneTimer = window.setTimeout(() => setPhase('gone'), FADE_MS);
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
          fetchPriority="low"
        />
        <div className="kutagjej-splash__bar" aria-hidden />
      </div>
    </div>
  );
}
