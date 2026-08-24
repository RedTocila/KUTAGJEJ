'use client';

import * as React from 'react';

export type VisualViewportBox = {
  offsetTop: number;
  offsetLeft: number;
  width: number;
  height: number;
  /** Layout-viewport space below the visual viewport (keyboard + browser chrome). */
  insetBottom: number;
};

const EMPTY_BOX: VisualViewportBox = {
  offsetTop: 0,
  offsetLeft: 0,
  width: 0,
  height: 0,
  insetBottom: 0,
};

function readVisualViewportBox(): VisualViewportBox {
  const vv = window.visualViewport;
  if (!vv) {
    return {
      offsetTop: 0,
      offsetLeft: 0,
      width: Math.round(window.innerWidth),
      height: Math.round(window.innerHeight),
      insetBottom: 0,
    };
  }
  const offsetTop = Math.round(vv.offsetTop);
  const offsetLeft = Math.round(vv.offsetLeft);
  const width = Math.round(vv.width);
  const height = Math.round(vv.height);
  const insetBottom = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
  return { offsetTop, offsetLeft, width, height, insetBottom };
}

function sameBox(a: VisualViewportBox, b: VisualViewportBox): boolean {
  return (
    a.offsetTop === b.offsetTop &&
    a.offsetLeft === b.offsetLeft &&
    a.width === b.width &&
    a.height === b.height &&
    a.insetBottom === b.insetBottom
  );
}

/**
 * Tracks `visualViewport` so fixed bottom sheets can sit on the iOS keyboard
 * instead of the layout viewport (which does not shrink when the keyboard opens).
 */
export function useVisualViewportBox(active: boolean): VisualViewportBox {
  const [box, setBox] = React.useState<VisualViewportBox>(EMPTY_BOX);

  React.useEffect(() => {
    if (!active) {
      setBox(EMPTY_BOX);
      return undefined;
    }

    const update = () => {
      const next = readVisualViewportBox();
      setBox((prev) => (sameBox(prev, next) ? prev : next));
    };

    update();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [active]);

  return box;
}
