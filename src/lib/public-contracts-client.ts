'use client';

import type { PublicContract } from '@/types/contract';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;

export async function listPublicContracts(params?: {
  categoryKey?: string;
  subscriberKind?: 'agent' | 'company';
}): Promise<{ contracts?: PublicContract[]; error?: string }> {
  try {
    const sp = new URLSearchParams();
    if (params?.categoryKey) sp.set('categoryKey', params.categoryKey);
    if (params?.subscriberKind) sp.set('subscriberKind', params.subscriberKind);
    const q = sp.toString();
    const url = `${API_URL}/contracts${q ? `?${q}` : ''}`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' };
    return { contracts: data.contracts as PublicContract[] };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
