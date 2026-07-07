'use client';

import type { AdminCreditPackage, CreditPackageInput } from '@/types/payment';
import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

export async function listAdminCreditPackages(): Promise<{
  packages?: AdminCreditPackage[];
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/admin/credit-packages'), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' };
    return { packages: data.packages as AdminCreditPackage[] };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function createCreditPackage(
  body: CreditPackageInput,
): Promise<{ package?: AdminCreditPackage; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/admin/credit-packages'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Krijimi dështoi.' };
    return { package: data.package as AdminCreditPackage };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function updateCreditPackage(
  id: string,
  body: Partial<CreditPackageInput>,
): Promise<{ package?: AdminCreditPackage; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/admin/credit-packages/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Përditësimi dështoi.' };
    return { package: data.package as AdminCreditPackage };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function deleteCreditPackage(id: string): Promise<{ ok?: boolean; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/admin/credit-packages/${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Fshirja dështoi.' };
    return { ok: true };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
