'use client';

import * as React from 'react';

import { fetchStorePriceStrings } from '@/lib/revenuecat-client';

/** Localized App Store prices. Empty until StoreKit responds. */
export function useStorePrices(enabled: boolean): Record<string, string> {
  const [prices, setPrices] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void fetchStorePriceStrings()
      .then((map) => {
        if (!cancelled) setPrices(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return prices;
}
