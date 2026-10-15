'use client';

import * as React from 'react';

/** Twelve radial ticks — the count, spacing, and opacity chase of UIActivityIndicatorView. */
export function IosSpinner({ large = false }: { large?: boolean }): React.JSX.Element {
  return (
    <span className={large ? 'kg-ios-spinner kg-ios-spinner--large' : 'kg-ios-spinner'} aria-hidden>
      {Array.from({ length: 12 }, (_, index) => (
        <span
          key={index}
          style={{
            transform: `rotate(${index * 30}deg)`,
            animationDelay: `${(-index / 12).toFixed(4)}s`,
          }}
        />
      ))}
    </span>
  );
}
