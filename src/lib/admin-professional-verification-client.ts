'use client';

import type { JobEmployerVerificationRequest } from '@/lib/job-employer-verification-client';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('custom-auth-token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function listProfessionalVerificationRequests(
  status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
): Promise<{ requests?: JobEmployerVerificationRequest[]; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/admin/professional-verification?status=${status}`, {
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

export async function reviewProfessionalVerificationRequest(
  id: string,
  decision: 'approve' | 'reject',
  adminNote?: string,
): Promise<{ request?: JobEmployerVerificationRequest; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/admin/professional-verification/${encodeURIComponent(id)}`, {
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
