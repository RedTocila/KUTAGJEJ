'use client';

import * as React from 'react';

/**
 * Hides chrome while scrolling down, shows it when scrolling up (or when near
 * the top of the page). Uses a small delta threshold to ignore tiny jitters.
 */
export function useScrollRevealHidden(options?: {
  deltaThreshold?: number;
  alwaysShowBelowY?: number;
}): boolean {
  const deltaThreshold = options?.deltaThreshold ?? 6;
  const alwaysShowBelowY = options?.alwaysShowBelowY ?? 56;
  const [hidden, setHidden] = React.useState(false);
  const lastY = React.useRef(0);

  React.useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const prev = lastY.current;
      const delta = y - prev;
      lastY.current = y;

      if (y <= alwaysShowBelowY) {
        setHidden(false);
        return;
      }
      if (delta > deltaThreshold) {
        setHidden(true);
      } else if (delta < -deltaThreshold) {
        setHidden(false);
      }
    };

    lastY.current = window.scrollY;
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [alwaysShowBelowY, deltaThreshold]);

  return hidden;
}
