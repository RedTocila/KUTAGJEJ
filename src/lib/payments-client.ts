'use client';

import type {
  AutoRefreshPackage,
  AutoRefreshStatus,
  CreatedOrder,
  CreditPackage,
  Payment,
  PokEnv,
  PremiumPackage,
  PremiumPlanQuota,
  PremiumVoucher,
  UserSubscriptionSummary,
} from '@/types/payment';
import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

export async function listCreditPackages(): Promise<{
  packages?: CreditPackage[];
  pokEnv?: PokEnv;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/payments/credit-packages'), { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' };
    return { packages: data.packages as CreditPackage[], pokEnv: data.pokEnv as PokEnv };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function listAutoRefreshPackages(): Promise<{
  packages?: AutoRefreshPackage[];
  pokEnv?: PokEnv;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/payments/auto-refresh-packages'), { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' };
    return { packages: data.packages as AutoRefreshPackage[], pokEnv: data.pokEnv as PokEnv };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function fetchAutoRefreshStatus(): Promise<{
  status?: AutoRefreshStatus;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/payments/auto-refresh/status'), {
      headers: authHeaders(),
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
    const res = await fetch(getApiUrl('/payments/subscription/order'), {
      method: 'POST',
      headers: authHeaders(),
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
    const res = await fetch(getApiUrl('/payments/credits/order'), {
      method: 'POST',
      headers: authHeaders(),
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
    const res = await fetch(getApiUrl('/payments/auto-refresh/order'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ packageId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Nuk u krijua pagesa.' };
    return { order: data as CreatedOrder };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function listPremiumPackages(): Promise<{
  packages?: PremiumPackage[];
  pokEnv?: PokEnv;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/payments/premium-packages'), { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' };
    return { packages: data.packages as PremiumPackage[], pokEnv: data.pokEnv as PokEnv };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function createPremiumOrder(
  packageId: string,
): Promise<{ order?: CreatedOrder; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/payments/premium/order'), {
      method: 'POST',
      headers: authHeaders(),
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
    const res = await fetch(getApiUrl('/payments/premium/buy-with-credits'), {
      method: 'POST',
      headers: authHeaders(),
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
    const res = await fetch(getApiUrl(`/payments/premium/vouchers${q}`), {
      headers: authHeaders(),
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
    const res = await fetch(getApiUrl('/payments/premium/quota'), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Kuota dështoi.' };
    return {
      quota: {
        max: Number(data.max) || 0,
        used: Number(data.used) || 0,
        remaining: Number(data.remaining) || 0,
        days: Number(data.days) || 30,
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
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/payments/premium/apply'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Aplikimi dështoi.' };
    return {
      voucher: data.voucher as PremiumVoucher,
      premiumUntil: typeof data.premiumUntil === 'string' ? data.premiumUntil : undefined,
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
  alreadyActive?: boolean;
  quota?: PremiumPlanQuota;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/payments/premium/apply-from-plan'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Aplikimi dështoi.' };
    return {
      premiumUntil: typeof data.premiumUntil === 'string' ? data.premiumUntil : undefined,
      alreadyActive: Boolean(data.alreadyActive),
      quota: data.quota
        ? {
            max: Number(data.quota.max) || 0,
            used: Number(data.quota.used) || 0,
            remaining: Number(data.quota.remaining) || 0,
            days: Number(data.quota.days) || 30,
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
    const res = await fetch(getApiUrl(`/payments/${encodeURIComponent(paymentId)}/verify`), {
      method: 'POST',
      headers: authHeaders(),
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
    const res = await fetch(getApiUrl('/payments/mine'), { headers: authHeaders(), cache: 'no-store' });
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
    const res = await fetch(getApiUrl('/payments/subscriptions/mine'), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' };
    return { subscriptions: data.subscriptions as UserSubscriptionSummary[] };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
