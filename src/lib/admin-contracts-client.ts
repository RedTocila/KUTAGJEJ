'use client';

import type { Contract, ContractPlanCode, ContractSubscriberKind } from '@/types/contract';
import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

export type ContractInput = {
  title: string;
  content?: string;
  roleIds: string[];
  listingCategoryKey: string | null;
  subscriberKind: ContractSubscriberKind;
  refreshEveryHours: number;
  glowBadgeEnabled: boolean;
  boostCredits: number;
  dailyBoostAccess: boolean;
  maxListAllCategories: number;
  maxJobListings: number;
  maxCarListings: number;
  maxApartmentListings: number;
  maxProductListings: number;
  maxPremiumListings: number;
  price1Month: number | null;
  price3Months: number | null;
  price6Months: number | null;
  price12Months: number | null;
  planCode?: ContractPlanCode | null;
  sortOrder?: number;
};

export async function listContracts(): Promise<{ contracts?: Contract[]; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/admin/contracts'), { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista e kontratave dështoi.' };
    return { contracts: data.contracts as Contract[] };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function createContract(body: ContractInput): Promise<{ contract?: Contract; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/admin/contracts'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Krijimi dështoi.' };
    return { contract: data.contract as Contract };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function updateContract(
  id: string,
  body: Partial<ContractInput>,
): Promise<{ contract?: Contract; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/admin/contracts/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Përditësimi dështoi.' };
    return { contract: data.contract as Contract };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function deleteContract(id: string): Promise<{ error?: string; ok?: boolean }> {
  try {
    const res = await fetch(getApiUrl(`/admin/contracts/${encodeURIComponent(id)}`), {
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
