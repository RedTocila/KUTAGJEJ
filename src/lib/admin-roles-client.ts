'use client';

import type { Role } from '@/types/role';
import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';


export async function listRoles(): Promise<{ roles?: Role[]; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/admin/roles'), { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista e roleve dështoi.' };
    return { roles: data.roles as Role[] };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function createRole(body: { name: string; description?: string }): Promise<{ role?: Role; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/admin/roles'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Krijimi i rolit dështoi.' };
    return { role: data.role as Role };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function updateRole(
  id: string,
  body: Partial<{ name: string; description: string }>,
): Promise<{ role?: Role; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/admin/roles/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Përditësimi dështoi.' };
    return { role: data.role as Role };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function deleteRole(id: string): Promise<{ error?: string; ok?: boolean }> {
  try {
    const res = await fetch(getApiUrl(`/admin/roles/${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Fshirja dështoi.' };
    return { ok: true };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
