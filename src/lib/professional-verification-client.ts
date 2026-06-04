'use client';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('custom-auth-token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export type { JobEmployerVerificationRequest as ProfessionalVerificationRequest } from '@/lib/job-employer-verification-client';
export type { JobEmployerVerificationStatus as ProfessionalVerificationStatus } from '@/lib/job-employer-verification-client';

import type {
  JobEmployerVerificationRequest,
  JobEmployerVerificationStatus,
} from '@/lib/job-employer-verification-client';

export async function fetchProfessionalVerificationStatus(): Promise<{
  status?: JobEmployerVerificationStatus;
  error?: string;
}> {
  try {
    const res = await fetch(`${API_URL}/professional-verification/status`, {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Gabim.' };
    return { status: data as JobEmployerVerificationStatus };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function submitProfessionalVerificationRequest(
  message?: string,
): Promise<{ request?: JobEmployerVerificationRequest; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/professional-verification/request`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ message: message?.trim() || '' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Gabim.' };
    return { request: data.request as JobEmployerVerificationRequest };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
