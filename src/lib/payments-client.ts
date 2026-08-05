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
import { authHeadersAsync } from '@/lib/api-client';
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
    const res = await fetch(getApiUrl('/payments/subscription/order'), {
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
    const res = await fetch(getApiUrl('/payments/credits/order'), {
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
    const res = await fetch(getApiUrl('/payments/auto-refresh/order'), {
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
    const res = await fetch(getApiUrl('/payments/premium/buy-with-credits'), {
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
    const res = await fetch(getApiUrl(`/payments/premium/vouchers${q}`), {
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
    const res = await fetch(getApiUrl('/payments/premium/quota'), {
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
      headers: await authHeadersAsync(),
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
      headers: await authHeadersAsync(),
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

export async function listOkazionPackages(): Promise<{
  packages?: OkazionPackage[];
  pokEnv?: PokEnv;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/payments/okazion-packages'), { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' };
    return { packages: data.packages as OkazionPackage[], pokEnv: data.pokEnv as PokEnv };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function createOkazionOrder(
  packageId: string,
  quantity = 1,
): Promise<{ order?: CreatedOrder; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/payments/okazion/order'), {
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
    const res = await fetch(getApiUrl('/payments/okazion/buy-with-credits'), {
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
    const res = await fetch(getApiUrl(`/payments/okazion/vouchers${q}`), {
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
    const res = await fetch(getApiUrl('/payments/okazion/quota'), {
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
        days: Number(data.days) || 5,
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
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/payments/okazion/apply'), {
      method: 'POST',
      headers: await authHeadersAsync(),
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Aplikimi dështoi.' };
    return {
      voucher: data.voucher as OkazionVoucher,
      okazionUntil: typeof data.okazionUntil === 'string' ? data.okazionUntil : undefined,
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
  alreadyActive?: boolean;
  quota?: OkazionPlanQuota;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/payments/okazion/apply-from-plan'), {
      method: 'POST',
      headers: await authHeadersAsync(),
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Aplikimi dështoi.' };
    return {
      okazionUntil: typeof data.okazionUntil === 'string' ? data.okazionUntil : undefined,
      alreadyActive: Boolean(data.alreadyActive),
      quota: data.quota
        ? {
            max: Number(data.quota.max) || 0,
            used: Number(data.quota.used) || 0,
            remaining: Number(data.quota.remaining) || 0,
            days: Number(data.quota.days) || 5,
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
    const res = await fetch(getApiUrl('/payments/mine'), { headers: await authHeadersAsync(), cache: 'no-store' });
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
