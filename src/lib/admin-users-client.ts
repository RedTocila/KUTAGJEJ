'use client';

import type { ManagedUser } from '@/types/managed-user';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('custom-auth-token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function listManagedUsers(): Promise<{ users?: ManagedUser[]; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/admin/users`, { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' };
    return { users: data.users as ManagedUser[] };
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
    const res = await fetch(`${API_URL}/admin/users`, {
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
    const res = await fetch(`${API_URL}/admin/users/${encodeURIComponent(id)}`, {
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
    const res = await fetch(`${API_URL}/admin/users/${encodeURIComponent(id)}`, {
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
