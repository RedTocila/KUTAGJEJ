'use client';

import * as React from 'react';

type ScrollRoot = Window | HTMLElement;

function readScrollY(root: ScrollRoot): number {
  return root instanceof HTMLElement ? root.scrollTop : root.scrollY;
}

/**
 * Hides chrome while scrolling down, shows it when scrolling up (or when near
 * the top of the page). Uses a small delta threshold to ignore tiny jitters.
 *
 * `target` is the scroll container (e.g. the mobile tab pane). Window is used
 * when it is omitted.
 */
export function useScrollRevealHidden(options?: {
  deltaThreshold?: number;
  alwaysShowBelowY?: number;
  target?: HTMLElement | null;
}): boolean {
  const deltaThreshold = options?.deltaThreshold ?? 6;
  const alwaysShowBelowY = options?.alwaysShowBelowY ?? 56;
  const target = options?.target ?? null;
  const [hidden, setHidden] = React.useState(false);
  const lastY = React.useRef(0);

  React.useEffect(() => {
    const root: ScrollRoot = target ?? window;
    const onScroll = () => {
      const y = readScrollY(root);
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

    lastY.current = readScrollY(root);
    setHidden(false);
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, [alwaysShowBelowY, deltaThreshold, target]);

  return hidden;
}
