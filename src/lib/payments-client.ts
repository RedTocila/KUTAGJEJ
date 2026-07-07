'use client';

import type {
  CreatedOrder,
  CreditPackage,
  Payment,
  PokEnv,
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
