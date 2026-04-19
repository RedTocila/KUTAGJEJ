'use client';

import type { ReferralProgram } from '@/types/referral-program';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('custom-auth-token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function fetchReferralProgramPublic(): Promise<{ program?: ReferralProgram; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/referral-program`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Programi nuk u lexua.' };
    return { program: data.program as ReferralProgram };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function fetchReferralProgramAdmin(): Promise<{ program?: ReferralProgram; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/admin/referral-program`, { headers: authHeaders(), cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Programi nuk u lexua.' };
    return { program: data.program as ReferralProgram };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function putReferralProgram(
  program: ReferralProgram,
): Promise<{ program?: ReferralProgram; error?: string }> {
  try {
    const { id: _id, updatedAt: _u, ...payload } = program;
    const res = await fetch(`${API_URL}/admin/referral-program`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Ruajtja dështoi.' };
    return { program: data.program as ReferralProgram };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
