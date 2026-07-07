'use client';

import type { AdminPaymentsResponse } from '@/types/payment';
import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

export async function listAdminPayments(params?: {
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}): Promise<{ data?: AdminPaymentsResponse; error?: string }> {
  try {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.type) sp.set('type', params.type);
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    const q = sp.toString();
    const res = await fetch(getApiUrl(q ? `/admin/payments?${q}` : '/admin/payments'), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' };
    return { data: data as AdminPaymentsResponse };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
