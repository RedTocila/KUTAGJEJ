'use client';

import * as React from 'react';

import { BrandLoadingScreen } from '@/components/core/brand-loading-screen';

/** Keep in sync with `kutagjejSplashReveal` in `global.css`. */
const FILL_MS = 1200;
const FADE_MS = 320;

/**
 * Cold-start cover. The bar fills, then the artwork fades and reveals the page.
 * Fully React-owned (do not inject/remove sibling DOM under `<body>`).
 */
export function SplashScreen(): React.JSX.Element | null {
  const [phase, setPhase] = React.useState<'show' | 'hiding' | 'gone'>('show');

  React.useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fill = reduceMotion ? 0 : FILL_MS;
    const fade = reduceMotion ? 0 : FADE_MS;
    const fadeTimer = window.setTimeout(() => setPhase('hiding'), fill);
    const goneTimer = window.setTimeout(() => setPhase('gone'), fill + fade);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(goneTimer);
    };
  }, []);

  if (phase === 'gone') return null;

  return <BrandLoadingScreen mode="reveal" hiding={phase === 'hiding'} />;
}
