'use client';

import * as React from 'react';
import { ViewTransition } from 'react';
import { usePathname } from 'next/navigation';

import { NAV_TRANSITION_TYPES } from '@/lib/nav-transition';

const ROUTE_UPDATE_CLASS = {
  [NAV_TRANSITION_TYPES.forward]: 'kg-route',
  [NAV_TRANSITION_TYPES.settle]: 'kg-route',
  default: 'none',
};

/**
 * Starts a document view transition for tagged route changes only. The visible motion is
 * the `root` snapshot, styled in `global.css` by `html[data-kg-nav]`.
 *
 * React cancels the root snapshot unless a boundary's size changes, and ignores size on
 * fixed/absolute nodes — so the probe is an in-flow span (inside a fixed, invisible
 * wrapper) whose width flips between 1px and 2px on every pathname change.
 */
export function RouteTransitionTrigger(): React.JSX.Element {
  const pathname = usePathname();
  const [probe, setProbe] = React.useState({ pathname, wide: false });
  if (probe.pathname !== pathname) {
    setProbe({ pathname, wide: !probe.wide });
  }

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 2,
        height: 1,
        overflow: 'hidden',
        opacity: 0,
        pointerEvents: 'none',
      }}
    >
      <ViewTransition default="none" enter="none" exit="none" share="none" update={ROUTE_UPDATE_CLASS}>
        <span style={{ display: 'block', width: probe.wide ? 2 : 1, height: 1 }} />
      </ViewTransition>
    </div>
  );
}
