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

export async function updatePortalUserIdentity(
  id: string,
  body: { nipt?: string; idNumber?: string },
): Promise<{
  ok?: boolean;
  email?: string;
  changes?: { nipt?: { before: string | null; after: string }; idNumber?: { before: string | null; after: string } };
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl(`/admin/users/${encodeURIComponent(id)}/portal-identity`), {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Përditësimi dështoi.' };
    return data;
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function updatePortalUserProfile(
  id: string,
  body: Partial<{
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    isActive: boolean;
    businessName: string;
    businessOwner: string;
    businessCategory: string;
    basedCityId: string | null;
    avatarUrl: string;
    nipt: string;
    idNumber: string;
  }>,
): Promise<{ ok?: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/admin/users/${encodeURIComponent(id)}/portal-profile`), {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Përditësimi dështoi.' };
    return { ok: true, message: typeof data.message === 'string' ? data.message : undefined };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function revokePortalUserVerification(
  id: string,
): Promise<{ ok?: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/admin/users/${encodeURIComponent(id)}/portal-verification`), {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Heqja e verifikimit dështoi.' };
    return { ok: true, message: typeof data.message === 'string' ? data.message : undefined };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
