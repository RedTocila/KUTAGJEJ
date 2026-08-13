'use client';

import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

export interface JobEmployerApplicantSnapshot {
  displayName: string;
  email: string;
  phone: string;
  accountKind: 'individual' | 'business';
  firstName?: string;
  lastName?: string;
  businessName?: string;
  businessOwner?: string;
  nipt?: string;
  businessCategory?: string;
  memberSince?: string;
}

export interface JobEmployerVerificationRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  message: string;
  adminNote?: string;
  idNumber?: string;
  idFrontImageUrl?: string;
  nipt?: string;
  applicantSnapshot: JobEmployerApplicantSnapshot;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobEmployerVerificationStatus {
  verified: boolean;
  canRequest: boolean;
  latestRequest: JobEmployerVerificationRequest | null;
}

export async function fetchJobEmployerVerificationStatus(): Promise<{
  status?: JobEmployerVerificationStatus;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/job-employer-verification/status'), {
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

export async function submitJobEmployerVerificationRequest(payload: {
  message?: string;
  idNumber: string;
  idFrontImageUrl: string;
  nipt?: string;
}): Promise<{ request?: JobEmployerVerificationRequest; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/job-employer-verification/request'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        message: payload.message?.trim() || '',
        idNumber: payload.idNumber.trim(),
        idFrontImageUrl: payload.idFrontImageUrl.trim(),
        nipt: payload.nipt?.trim() || '',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Gabim.' };
    return { request: data.request as JobEmployerVerificationRequest };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
