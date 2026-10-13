'use client';

import * as React from 'react';

import { BrandLoadingScreen } from '@/components/core/brand-loading-screen';

/** Keep in sync with `.kutagjej-splash--hide` in `global.css`. */
const FADE_MS = 420;
/** Never trap the launch cover if a loader fails to clear. */
const BOOT_TIMEOUT_MS = 12_000;

function bootStillPending(): boolean {
  return document.querySelector('[data-kg-boot-pending], [data-kg-route-loader]') != null;
}

/**
 * Cold-start cover. Stays up until the first page is ready (no route loader,
 * no entry skeletons), then fades out. Fully React-owned.
 */
export function SplashScreen(): React.JSX.Element | null {
  const [phase, setPhase] = React.useState<'show' | 'hiding' | 'gone'>('show');

  React.useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fade = reduceMotion ? 0 : FADE_MS;
    let raf = 0;
    let goneTimer = 0;
    let quietFrames = 0;
    const started = performance.now();

    const finish = () => {
      setPhase('hiding');
      goneTimer = window.setTimeout(() => setPhase('gone'), fade);
    };

    const tick = () => {
      const timedOut = performance.now() - started >= BOOT_TIMEOUT_MS;
      if (!bootStillPending() || timedOut) quietFrames += 1;
      else quietFrames = 0;
      // Two quiet frames so a loader that mounts on the next commit can still hold the cover.
      if (quietFrames >= 2) {
        finish();
        return;
      }
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(goneTimer);
    };
  }, []);

  if (phase === 'gone') return null;

  return <BrandLoadingScreen mode="reveal" progress={false} hiding={phase === 'hiding'} />;
}
