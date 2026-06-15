'use client';

import type { DirectoryUser } from '@/types/directory-user';
import type { ManagedUser } from '@/types/managed-user';
import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';


export async function listManagedUsers(): Promise<{ users?: DirectoryUser[]; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/admin/users'), { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' };
    return { users: data.users as DirectoryUser[] };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function createManagedUser(body: {
  email: string;
  password: string;
  roleId: string;
  firstName?: string;
  lastName?: string;
}): Promise<{ user?: ManagedUser; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/admin/users'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Krijimi dështoi.' };
    return { user: data.user as ManagedUser };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function updateManagedUser(
  id: string,
  body: Partial<{
    email: string;
    password: string;
    roleId: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  }>,
): Promise<{ user?: ManagedUser; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/admin/users/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Përditësimi dështoi.' };
    return { user: data.user as ManagedUser };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function deleteManagedUser(id: string): Promise<{ error?: string; ok?: boolean }> {
  try {
    const res = await fetch(getApiUrl(`/admin/users/${encodeURIComponent(id)}`), {
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
