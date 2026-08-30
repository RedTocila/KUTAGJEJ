'use client';

import type {
  AutoRefreshPackage,
  AutoRefreshStatus,
  CreatedOrder,
  CreditPackage,
  OkazionPackage,
  OkazionPlanQuota,
  OkazionVoucher,
  Payment,
  PokEnv,
  PremiumPackage,
  PremiumPlanQuota,
  PremiumVoucher,
  UserSubscriptionSummary,
} from '@/types/payment';
import { apiFetch, authHeadersAsync } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

const CATALOG_TTL_MS = 60_000;
const catalogCache = new Map<string, { at: number; value: unknown }>();

function readCatalogCache<T>(key: string): T | null {
  const hit = catalogCache.get(key) as { at: number; value: T & { error?: string } } | undefined;
  if (!hit || Date.now() - hit.at > CATALOG_TTL_MS || hit.value.error) return null;
  return hit.value;
}

function writeCatalogCache(key: string, value: unknown): void {
  catalogCache.set(key, { at: Date.now(), value });
}

export async function listCreditPackages(): Promise<{
  packages?: CreditPackage[];
  pokEnv?: PokEnv;
  error?: string;
}> {
  const cached = readCatalogCache<{ packages?: CreditPackage[]; pokEnv?: PokEnv; error?: string }>(
    'credit-packages',
  );
  if (cached) return cached;
  try {
    const res = await apiFetch(getApiUrl('/payments/credit-packages'), { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' };
    const value = {
      packages: data.packages as CreditPackage[],
      pokEnv: data.pokEnv as PokEnv,
    };
    writeCatalogCache('credit-packages', value);
    return value;
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function listAutoRefreshPackages(): Promise<{
  packages?: AutoRefreshPackage[];
  pokEnv?: PokEnv;
  error?: string;
}> {
  const cached = readCatalogCache<{ packages?: AutoRefreshPackage[]; pokEnv?: PokEnv; error?: string }>(
    'auto-refresh-packages',
  );
  if (cached) return cached;
  try {
    const res = await apiFetch(getApiUrl('/payments/auto-refresh-packages'), { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' };
    const value = {
      packages: data.packages as AutoRefreshPackage[],
      pokEnv: data.pokEnv as PokEnv,
    };
    writeCatalogCache('auto-refresh-packages', value);
    return value;
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function fetchAutoRefreshStatus(): Promise<{
  status?: AutoRefreshStatus;
  error?: string;
}> {
  try {
    const res = await apiFetch(getApiUrl('/payments/auto-refresh/status'), {
      headers: await authHeadersAsync(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Statusi dështoi.' };
    return {
      status: {
        slots: Number(data.slots) || 0,
        used: Number(data.used) || 0,
        planCode: String(data.planCode || 'free'),
        refreshEveryHours: Number(data.refreshEveryHours) || 48,
        packages: Array.isArray(data.packages) ? (data.packages as AutoRefreshPackage[]) : [],
      },
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function createSubscriptionOrder(
  contractId: string,
  months: number,
): Promise<{ order?: CreatedOrder; error?: string }> {
  try {
    const res = await apiFetch(getApiUrl('/payments/subscription/order'), {
      method: 'POST',
      headers: await authHeadersAsync(),
      body: JSON.stringify({ contractId, months }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Nuk u krijua pagesa.' };
    return { order: data as CreatedOrder };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function createCreditsOrder(
  packageId: string,
): Promise<{ order?: CreatedOrder; error?: string }> {
  try {
    const res = await apiFetch(getApiUrl('/payments/credits/order'), {
      method: 'POST',
      headers: await authHeadersAsync(),
      body: JSON.stringify({ packageId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Nuk u krijua pagesa.' };
    return { order: data as CreatedOrder };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function createAutoRefreshOrder(
  packageId: string,
): Promise<{ order?: CreatedOrder; error?: string }> {
  try {
    const res = await apiFetch(getApiUrl('/payments/auto-refresh/order'), {
      method: 'POST',
      headers: await authHeadersAsync(),
      body: JSON.stringify({ packageId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Nuk u krijua pagesa.' };
    return { order: data as CreatedOrder };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function buyAutoRefreshWithCredits(packageId: string): Promise<{
  slots?: number;
  autoRefreshSlots?: number;
  boostCredits?: number;
  cost?: number;
  used?: number;
  message?: string;
  error?: string;
}> {
  try {
    const res = await apiFetch(getApiUrl('/payments/auto-refresh/buy-with-credits'), {
      method: 'POST',
      headers: await authHeadersAsync(),
      body: JSON.stringify({ packageId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Blerja dështoi.' };
    return {
      slots: typeof data.slots === 'number' ? data.slots : undefined,
      autoRefreshSlots: typeof data.autoRefreshSlots === 'number' ? data.autoRefreshSlots : undefined,
      boostCredits: typeof data.boostCredits === 'number' ? data.boostCredits : undefined,
      cost: typeof data.cost === 'number' ? data.cost : undefined,
      used: typeof data.used === 'number' ? data.used : undefined,
      message: typeof data.message === 'string' ? data.message : undefined,
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function listPremiumPackages(): Promise<{
  packages?: PremiumPackage[];
  pokEnv?: PokEnv;
  error?: string;
}> {
  const cached = readCatalogCache<{ packages?: PremiumPackage[]; pokEnv?: PokEnv; error?: string }>(
    'premium-packages',
  );
  if (cached) return cached;
  try {
    const res = await apiFetch(getApiUrl('/payments/premium-packages'), { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' };
    const value = {
      packages: data.packages as PremiumPackage[],
      pokEnv: data.pokEnv as PokEnv,
    };
    writeCatalogCache('premium-packages', value);
    return value;
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function createPremiumOrder(
  packageId: string,
): Promise<{ order?: CreatedOrder; error?: string }> {
  try {
    const res = await apiFetch(getApiUrl('/payments/premium/order'), {
      method: 'POST',
      headers: await authHeadersAsync(),
      body: JSON.stringify({ packageId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Nuk u krijua pagesa.' };
    return { order: data as CreatedOrder };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function buyPremiumWithCredits(packageId: string): Promise<{
  voucher?: PremiumVoucher;
  boostCredits?: number;
  cost?: number;
  message?: string;
  error?: string;
}> {
  try {
    const res = await apiFetch(getApiUrl('/payments/premium/buy-with-credits'), {
      method: 'POST',
      headers: await authHeadersAsync(),
      body: JSON.stringify({ packageId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Blerja dështoi.' };
    return {
      voucher: data.voucher as PremiumVoucher,
      boostCredits: typeof data.boostCredits === 'number' ? data.boostCredits : undefined,
      cost: typeof data.cost === 'number' ? data.cost : undefined,
      message: typeof data.message === 'string' ? data.message : undefined,
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function listPremiumVouchers(unusedOnly = false): Promise<{
  vouchers?: PremiumVoucher[];
  error?: string;
}> {
  try {
    const q = unusedOnly ? '?unusedOnly=1' : '';
    const res = await apiFetch(getApiUrl(`/payments/premium/vouchers${q}`), {
      headers: await authHeadersAsync(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' };
    return { vouchers: Array.isArray(data.vouchers) ? (data.vouchers as PremiumVoucher[]) : [] };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function fetchPremiumPlanQuota(): Promise<{
  quota?: PremiumPlanQuota;
  error?: string;
}> {
  try {
    const res = await apiFetch(getApiUrl('/payments/premium/quota'), {
      headers: await authHeadersAsync(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Kuota dështoi.' };
    return {
      quota: {
        max: Number(data.max) || 0,
        used: Number(data.used) || 0,
        remaining: Number(data.remaining) || 0,
        days: Number(data.days) || 15,
      },
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function applyPremiumVoucher(params: {
  voucherId: string;
  kind: string;
  listingId: string;
}): Promise<{
  voucher?: PremiumVoucher;
  premiumUntil?: string;
  refreshedAt?: string;
  message?: string;
  error?: string;
}> {
  try {
    const res = await apiFetch(getApiUrl('/payments/premium/apply'), {
      method: 'POST',
      headers: await authHeadersAsync(),
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Aplikimi dështoi.' };
    return {
      voucher: data.voucher as PremiumVoucher,
      premiumUntil: typeof data.premiumUntil === 'string' ? data.premiumUntil : undefined,
      refreshedAt: typeof data.refreshedAt === 'string' ? data.refreshedAt : undefined,
      message: typeof data.message === 'string' ? data.message : undefined,
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function applyPremiumFromPlan(params: {
  kind: string;
  listingId: string;
}): Promise<{
  premiumUntil?: string;
  refreshedAt?: string;
  alreadyActive?: boolean;
  quota?: PremiumPlanQuota;
  message?: string;
  error?: string;
}> {
  try {
    const res = await apiFetch(getApiUrl('/payments/premium/apply-from-plan'), {
      method: 'POST',
      headers: await authHeadersAsync(),
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Aplikimi dështoi.' };
    return {
      premiumUntil: typeof data.premiumUntil === 'string' ? data.premiumUntil : undefined,
      refreshedAt: typeof data.refreshedAt === 'string' ? data.refreshedAt : undefined,
      alreadyActive: Boolean(data.alreadyActive),
      quota: data.quota
        ? {
            max: Number(data.quota.max) || 0,
            used: Number(data.quota.used) || 0,
            remaining: Number(data.quota.remaining) || 0,
            days: Number(data.quota.days) || 15,
          }
        : undefined,
      message: typeof data.message === 'string' ? data.message : undefined,
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function listOkazionPackages(): Promise<{
  packages?: OkazionPackage[];
  pokEnv?: PokEnv;
  error?: string;
}> {
  const cached = readCatalogCache<{ packages?: OkazionPackage[]; pokEnv?: PokEnv; error?: string }>(
    'okazion-packages',
  );
  if (cached) return cached;
  try {
    const res = await apiFetch(getApiUrl('/payments/okazion-packages'), { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' };
    const value = {
      packages: data.packages as OkazionPackage[],
      pokEnv: data.pokEnv as PokEnv,
    };
    writeCatalogCache('okazion-packages', value);
    return value;
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function createOkazionOrder(
  packageId: string,
  quantity = 1,
): Promise<{ order?: CreatedOrder; error?: string }> {
  try {
    const res = await apiFetch(getApiUrl('/payments/okazion/order'), {
      method: 'POST',
      headers: await authHeadersAsync(),
      body: JSON.stringify({ packageId, quantity }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Nuk u krijua pagesa.' };
    return { order: data as CreatedOrder };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function buyOkazionWithCredits(
  packageId: string,
  quantity = 1,
): Promise<{
  voucher?: OkazionVoucher;
  vouchers?: OkazionVoucher[];
  quantity?: number;
  boostCredits?: number;
  cost?: number;
  message?: string;
  error?: string;
}> {
  try {
    const res = await apiFetch(getApiUrl('/payments/okazion/buy-with-credits'), {
      method: 'POST',
      headers: await authHeadersAsync(),
      body: JSON.stringify({ packageId, quantity }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Blerja dështoi.' };
    return {
      voucher: data.voucher as OkazionVoucher,
      vouchers: Array.isArray(data.vouchers) ? (data.vouchers as OkazionVoucher[]) : undefined,
      quantity: typeof data.quantity === 'number' ? data.quantity : undefined,
      boostCredits: typeof data.boostCredits === 'number' ? data.boostCredits : undefined,
      cost: typeof data.cost === 'number' ? data.cost : undefined,
      message: typeof data.message === 'string' ? data.message : undefined,
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function listOkazionVouchers(unusedOnly = false): Promise<{
  vouchers?: OkazionVoucher[];
  error?: string;
}> {
  try {
    const q = unusedOnly ? '?unusedOnly=1' : '';
    const res = await apiFetch(getApiUrl(`/payments/okazion/vouchers${q}`), {
      headers: await authHeadersAsync(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' };
    return { vouchers: Array.isArray(data.vouchers) ? (data.vouchers as OkazionVoucher[]) : [] };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function fetchOkazionPlanQuota(): Promise<{
  quota?: OkazionPlanQuota;
  error?: string;
}> {
  try {
    const res = await apiFetch(getApiUrl('/payments/okazion/quota'), {
      headers: await authHeadersAsync(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Kuota dështoi.' };
    return {
      quota: {
        max: Number(data.max) || 0,
        used: Number(data.used) || 0,
        remaining: Number(data.remaining) || 0,
        days: Number(data.days) || 7,
      },
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function applyOkazionVoucher(params: {
  voucherId: string;
  kind: string;
  listingId: string;
}): Promise<{
  voucher?: OkazionVoucher;
  okazionUntil?: string;
  refreshedAt?: string;
  message?: string;
  error?: string;
}> {
  try {
    const res = await apiFetch(getApiUrl('/payments/okazion/apply'), {
      method: 'POST',
      headers: await authHeadersAsync(),
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Aplikimi dështoi.' };
    return {
      voucher: data.voucher as OkazionVoucher,
      okazionUntil: typeof data.okazionUntil === 'string' ? data.okazionUntil : undefined,
      refreshedAt: typeof data.refreshedAt === 'string' ? data.refreshedAt : undefined,
      message: typeof data.message === 'string' ? data.message : undefined,
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function applyOkazionFromPlan(params: {
  kind: string;
  listingId: string;
}): Promise<{
  okazionUntil?: string;
  refreshedAt?: string;
  alreadyActive?: boolean;
  quota?: OkazionPlanQuota;
  message?: string;
  error?: string;
}> {
  try {
    const res = await apiFetch(getApiUrl('/payments/okazion/apply-from-plan'), {
      method: 'POST',
      headers: await authHeadersAsync(),
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Aplikimi dështoi.' };
    return {
      okazionUntil: typeof data.okazionUntil === 'string' ? data.okazionUntil : undefined,
      refreshedAt: typeof data.refreshedAt === 'string' ? data.refreshedAt : undefined,
      alreadyActive: Boolean(data.alreadyActive),
      quota: data.quota
        ? {
            max: Number(data.quota.max) || 0,
            used: Number(data.quota.used) || 0,
            remaining: Number(data.quota.remaining) || 0,
            days: Number(data.quota.days) || 7,
          }
        : undefined,
      message: typeof data.message === 'string' ? data.message : undefined,
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function verifyPayment(
  paymentId: string,
): Promise<{ payment?: Payment; paid?: boolean; error?: string }> {
  try {
    const res = await apiFetch(getApiUrl(`/payments/${encodeURIComponent(paymentId)}/verify`), {
      method: 'POST',
      headers: await authHeadersAsync(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Verifikimi dështoi.' };
    return { payment: data.payment as Payment, paid: Boolean(data.paid) };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function listMyPayments(): Promise<{ payments?: Payment[]; error?: string }> {
  try {
    const res = await apiFetch(getApiUrl('/payments/mine'), { headers: await authHeadersAsync(), cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' };
    return { payments: data.payments as Payment[] };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function listMySubscriptions(): Promise<{
  subscriptions?: UserSubscriptionSummary[];
  error?: string;
}> {
  try {
    const res = await apiFetch(getApiUrl('/payments/subscriptions/mine'), {
      headers: await authHeadersAsync(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' };
    return { subscriptions: data.subscriptions as UserSubscriptionSummary[] };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function cancelMySubscription(
  subscriptionId: string,
): Promise<{ subscription?: UserSubscriptionSummary; error?: string }> {
  try {
    const res = await apiFetch(getApiUrl(`/payments/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`), {
      method: 'POST',
      headers: await authHeadersAsync({ 'Content-Type': 'application/json' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: typeof data.message === 'string' ? data.message : 'Anulimi dështoi.' };
    }
    return { subscription: data.subscription as UserSubscriptionSummary };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
