'use client';

import type {
  JobEmployerVerificationRequest,
  JobEmployerVerificationStatus,
} from '@/lib/job-employer-verification-client';
import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

export type { JobEmployerVerificationRequest as ProfessionalVerificationRequest } from '@/lib/job-employer-verification-client';
export type { JobEmployerVerificationStatus as ProfessionalVerificationStatus } from '@/lib/job-employer-verification-client';

export async function fetchProfessionalVerificationStatus(): Promise<{
  status?: JobEmployerVerificationStatus;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/professional-verification/status'), {
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
    const res = await fetch(getApiUrl('/professional-verification/request'), {
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
