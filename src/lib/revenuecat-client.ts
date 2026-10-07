'use client';

/**
 * RevenueCat / StoreKit purchases inside the Capacitor iOS (and later Android) shell.
 * No-ops on the regular website — web keeps POK checkout.
 */

import { isNativeApp, getNativePlatform } from '@/lib/native-app';
import { clientFetch } from '@/lib/api-client';

const IOS_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY || '';
const ANDROID_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY || '';

export type IapCatalog = {
  offeringId: string;
  plans: Record<string, string>;
  credits: Record<string, string>;
  premium: Record<string, string>;
  okazion: Record<string, string>;
};

let configured = false;
let configuring: Promise<void> | null = null;
let cachedCatalog: IapCatalog | null = null;

function publicApiKey(): string {
  const platform = getNativePlatform();
  if (platform === 'android') return ANDROID_API_KEY || IOS_API_KEY;
  return IOS_API_KEY;
}

export function isIapAvailable(): boolean {
  return isNativeApp() && Boolean(publicApiKey());
}

async function loadPurchases() {
  const mod = await import('@revenuecat/purchases-capacitor');
  return mod.Purchases;
}

/** Configure SDK once; call again with userId after login to identify the customer. */
export async function ensureRevenueCat(appUserId?: string | null): Promise<boolean> {
  if (!isNativeApp()) return false;
  const apiKey = publicApiKey();
  if (!apiKey) {
    console.warn('[iap] NEXT_PUBLIC_REVENUECAT_IOS_API_KEY is not set');
    return false;
  }

  if (!configuring) {
    configuring = (async () => {
      const Purchases = await loadPurchases();
      if (!configured) {
        await Purchases.configure({ apiKey, appUserID: appUserId || undefined });
        configured = true;
      } else if (appUserId) {
        await Purchases.logIn({ appUserID: appUserId });
      }
    })().catch((err) => {
      configuring = null;
      configured = false;
      throw err;
    });
  } else if (appUserId) {
    // Already configuring/configured — still log in when we learn the user id.
    await configuring;
    const Purchases = await loadPurchases();
    await Purchases.logIn({ appUserID: appUserId });
  }

  await configuring;
  return true;
}

export async function fetchIapCatalog(): Promise<IapCatalog> {
  if (cachedCatalog) return cachedCatalog;
  const res = await clientFetch<IapCatalog>('/iap/catalog');
  if (!res.ok || !res.data) {
    throw new Error(res.error || 'Katalogu IAP nuk u ngarkua.');
  }
  cachedCatalog = res.data;
  return res.data;
}

type PurchaseResult =
  | { ok: true }
  | { ok: false; cancelled?: boolean; message: string };

/**
 * Purchase a store product by App Store product ID, then wait for the webhook grant.
 */
export async function purchaseStoreProductId(
  productId: string,
  opts?: { userId?: string | null; timeoutMs?: number },
): Promise<PurchaseResult> {
  if (!isIapAvailable()) {
    return { ok: false, message: 'Blerjet në aplikacion nuk janë të disponueshme.' };
  }
  try {
    await ensureRevenueCat(opts?.userId);
    const Purchases = await loadPurchases();
    const started = Date.now();

    const products = await Purchases.getProducts({ productIdentifiers: [productId] });
    const product = products.products?.[0];
    if (!product) {
      return {
        ok: false,
        message: 'Produkti nuk u gjet në App Store (kontrollo produktin / Sandbox).',
      };
    }

    try {
      await Purchases.purchaseStoreProduct({ product });
    } catch (err: unknown) {
      const code = (err as { code?: number | string })?.code;
      const msg = String((err as { message?: string })?.message || err || '');
      // User cancelled
      if (
        code === 1 ||
        code === '1' ||
        /cancel|cancelled|canceled/i.test(msg) ||
        /PURCHASE_CANCELLED/i.test(msg)
      ) {
        return { ok: false, cancelled: true, message: 'Blerja u anulua.' };
      }
      return { ok: false, message: msg || 'Blerja dështoi.' };
    }

    const granted = await waitForGrant(productId, started, opts?.timeoutMs ?? 45_000);
    if (!granted) {
      return {
        ok: false,
        message:
          'Pagesa u krye, por aktivizimi vonoi. Provo "Rikthe blerjet" ose rifresko pas pak sekondash.',
      };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, message: String((err as Error)?.message || err || 'Blerja dështoi.') };
  }
}

export async function restorePurchases(opts?: { userId?: string | null }): Promise<PurchaseResult> {
  if (!isIapAvailable()) {
    return { ok: false, message: 'Blerjet në aplikacion nuk janë të disponueshme.' };
  }
  try {
    await ensureRevenueCat(opts?.userId);
    const Purchases = await loadPurchases();
    await Purchases.restorePurchases();
    // Renewals / prior subs are granted via webhook when RC syncs.
    await new Promise((r) => setTimeout(r, 1500));
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, message: String((err as Error)?.message || err || 'Rikthimi dështoi.') };
  }
}

async function waitForGrant(productId: string, sinceMs: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await clientFetch<{ found: boolean }>(
        `/iap/recent-grant?productId=${encodeURIComponent(productId)}&sinceMs=${sinceMs - 5_000}`,
      );
      if (res.ok && res.data?.found) return true;
    } catch {
      // keep polling
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  return false;
}

/** Map plan_code → store product via catalog. */
export async function purchasePlanByCode(
  planCode: string,
  opts?: { userId?: string | null },
): Promise<PurchaseResult> {
  const catalog = await fetchIapCatalog();
  const productId = catalog.plans[planCode];
  if (!productId) {
    return { ok: false, message: `Plani ${planCode} nuk është i disponueshëm në App Store.` };
  }
  return purchaseStoreProductId(productId, opts);
}

export async function purchaseCreditsPackage(
  creditPackageId: string,
  opts?: { userId?: string | null },
): Promise<PurchaseResult> {
  const catalog = await fetchIapCatalog();
  const productId = catalog.credits[creditPackageId];
  if (!productId) {
    return {
      ok: false,
      message: 'Ky paketë coins nuk shitet ende në aplikacion. Provo Starter, Growth ose Pro.',
    };
  }
  return purchaseStoreProductId(productId, opts);
}

export async function purchasePremiumPackage(
  packageId: string,
  opts?: { userId?: string | null },
): Promise<PurchaseResult> {
  const catalog = await fetchIapCatalog();
  const productId = catalog.premium[packageId];
  if (!productId) {
    return { ok: false, message: 'Paketa Premium nuk u gjet.' };
  }
  return purchaseStoreProductId(productId, opts);
}

export async function purchaseOkazionPackage(
  packageId: string,
  opts?: { userId?: string | null },
): Promise<PurchaseResult> {
  const catalog = await fetchIapCatalog();
  const productId = catalog.okazion[packageId];
  if (!productId) {
    return { ok: false, message: 'Paketa Okazion nuk u gjet.' };
  }
  return purchaseStoreProductId(productId, opts);
}
