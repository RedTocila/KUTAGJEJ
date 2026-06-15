'use client';

import type { JobEmployerVerificationRequest } from '@/lib/job-employer-verification-client';
import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';


export async function listJobEmployerVerificationRequests(
  status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
): Promise<{ requests?: JobEmployerVerificationRequest[]; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/admin/job-employer-verification?status=${status}`), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Gabim.' };
    return { requests: (data.requests ?? []) as JobEmployerVerificationRequest[] };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function reviewJobEmployerVerificationRequest(
  id: string,
  decision: 'approve' | 'reject',
  adminNote?: string,
): Promise<{ request?: JobEmployerVerificationRequest; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/admin/job-employer-verification/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ decision, adminNote: adminNote?.trim() || '' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Gabim.' };
    return { request: data.request as JobEmployerVerificationRequest };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
