'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';

function IosSpinner(): React.JSX.Element {
  return (
    <span className="kg-ios-spinner kg-ios-spinner--large" aria-hidden>
      {Array.from({ length: 12 }, (_, index) => (
        <span
          key={index}
          style={{
            transform: `rotate(${index * 30}deg)`,
            animationDelay: `${(-0.9 + index * 0.075).toFixed(3)}s`,
          }}
        />
      ))}
    </span>
  );
}

/** Centered iPhone activity indicator. Blocks taps while Apple’s payment sheet is opening. */
export function IosActivityOverlay(): React.JSX.Element | null {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="kg-ios-activity" role="status" aria-live="polite" aria-label="Duke u hapur">
      <IosSpinner />
    </div>,
    document.body,
  );
}
