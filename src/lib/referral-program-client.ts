'use client';

import type { ReferralProgram } from '@/types/referral-program';
import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';


export async function fetchReferralProgramPublic(): Promise<{ program?: ReferralProgram; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/referral-program'), { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Programi nuk u lexua.' };
    return { program: data.program as ReferralProgram };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function fetchReferralProgramAdmin(): Promise<{ program?: ReferralProgram; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/admin/referral-program'), { headers: authHeaders(), cache: 'no-store' });
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
    const res = await fetch(getApiUrl('/admin/referral-program'), {
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
