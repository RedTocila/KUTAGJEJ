'use client';

import { authHeadersAsync } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';
import type {
  JobEmployerVerificationRequest,
  JobEmployerVerificationStatus,
} from '@/lib/job-employer-verification-client';

export type { JobEmployerVerificationRequest as ProfessionalVerificationRequest } from '@/lib/job-employer-verification-client';
export type { JobEmployerVerificationStatus as ProfessionalVerificationStatus } from '@/lib/job-employer-verification-client';

async function parseVerificationError(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}));
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  if (res.status === 401) return 'Duhet të identifikoheni përsëri.';
  if (res.status >= 500) return 'Serveri nuk u përgjigj. Provoni përsëri.';
  return 'Gabim gjatë verifikimit.';
}

export async function fetchProfessionalVerificationStatus(): Promise<{
  status?: JobEmployerVerificationStatus;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/professional-verification/status'), {
      headers: await authHeadersAsync(),
      cache: 'no-store',
    });
    if (!res.ok) return { error: await parseVerificationError(res) };
    const data = await res.json().catch(() => null);
    if (!data || typeof data !== 'object') return { error: 'Përgjigje e pavlefshme nga serveri.' };
    return { status: data as JobEmployerVerificationStatus };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function submitProfessionalVerificationRequest(payload: {
  message?: string;
  idNumber: string;
  idFrontImageUrl: string;
  nipt?: string;
}): Promise<{ request?: JobEmployerVerificationRequest; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/professional-verification/request'), {
      method: 'POST',
      headers: await authHeadersAsync(),
      body: JSON.stringify({
        message: payload.message?.trim() || '',
        idNumber: payload.idNumber.trim(),
        idFrontImageUrl: payload.idFrontImageUrl.trim(),
        nipt: payload.nipt?.trim() || '',
      }),
    });
    if (!res.ok) return { error: await parseVerificationError(res) };
    const data = await res.json().catch(() => ({}));
    return { request: data.request as JobEmployerVerificationRequest };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
