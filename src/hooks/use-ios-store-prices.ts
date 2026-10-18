'use client';

import * as React from 'react';

import { useIsNativeApp } from '@/hooks/use-is-native-app';
import { getNativePlatform } from '@/lib/native-app';
import {
  fetchIapCatalog,
  isIapAvailable,
  loadStorePriceMap,
  type IapCatalog,
} from '@/lib/revenuecat-client';

export type IosPurchaseMode = 'web' | 'store' | 'unavailable';

export function formatStorePriceLabel(loading: boolean, price: string | null): string {
  if (loading) return '…';
  return price || 'I padisponueshëm';
}

function catalogKeys(catalog: IapCatalog): Record<string, string> {
  return {
    ...catalog.plans,
    ...catalog.credits,
    ...catalog.premium,
    ...catalog.okazion,
  };
}

/** iOS uses StoreKit. The website keeps card checkout. Android is unchanged. */
export function useIosPurchaseMode(): IosPurchaseMode {
  const native = useIsNativeApp();
  if (!native || getNativePlatform() !== 'ios') return 'web';
  return isIapAvailable() ? 'store' : 'unavailable';
}

/**
 * Localized StoreKit prices (`product.priceString`) for the iOS shell.
 * Keys are both App Store product ids and catalog ids (plan code, package id).
 */
export function useIosStorePrices(): {
  mode: IosPurchaseMode;
  loading: boolean;
  priceFor: (key: string | null | undefined) => string | null;
} {
  const mode = useIosPurchaseMode();
  const [prices, setPrices] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(mode === 'store');
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (mode !== 'store') {
      setLoading(false);
      setFailed(false);
      setPrices({});
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setFailed(false);

    void (async () => {
      try {
        const catalog = await fetchIapCatalog();
        const byKey = catalogKeys(catalog);
        const productIds = [...new Set(Object.values(byKey).filter(Boolean))];
        const byProductId = await loadStorePriceMap(productIds);
        if (cancelled) return;
        const next: Record<string, string> = { ...byProductId };
        for (const [key, productId] of Object.entries(byKey)) {
          const label = byProductId[productId];
          if (label) next[key] = label;
        }
        setPrices(next);
      } catch {
        if (!cancelled) {
          setPrices({});
          setFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode]);

  const resolvedMode: IosPurchaseMode = mode === 'store' && failed ? 'unavailable' : mode;

  const priceFor = React.useCallback(
    (key: string | null | undefined) => {
      if (!key || resolvedMode !== 'store') return null;
      return prices[key] || null;
    },
    [prices, resolvedMode],
  );

  return {
    mode: resolvedMode,
    loading: mode === 'store' && loading && !failed,
    priceFor,
  };
}
