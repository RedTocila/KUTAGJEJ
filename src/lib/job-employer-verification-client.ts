'use client';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('custom-auth-token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

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
    const res = await fetch(`${API_URL}/job-employer-verification/status`, {
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

export async function submitJobEmployerVerificationRequest(
  message?: string,
): Promise<{ request?: JobEmployerVerificationRequest; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/job-employer-verification/request`, {
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
