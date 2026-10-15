'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';

import { IosSpinner } from '@/components/core/ios-spinner';

/** Centered iPhone activity indicator. Blocks taps while Apple’s payment sheet is opening. */
export function IosActivityOverlay(): React.JSX.Element | null {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="kg-ios-activity" role="status" aria-live="polite" aria-label="Duke u hapur">
      <IosSpinner large />
    </div>,
    document.body,
  );
}
