'use client';

import type { Contract } from '@/types/contract';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('custom-auth-token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function listContracts(): Promise<{ contracts?: Contract[]; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/admin/contracts`, { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista e kontratave dështoi.' };
    return { contracts: data.contracts as Contract[] };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function createContract(body: {
  title: string;
  content?: string;
  roleIds: string[];
}): Promise<{ contract?: Contract; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/admin/contracts`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Krijimi dështoi.' };
    return { contract: data.contract as Contract };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function updateContract(
  id: string,
  body: Partial<{ title: string; content: string; roleIds: string[] }>,
): Promise<{ contract?: Contract; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/admin/contracts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Përditësimi dështoi.' };
    return { contract: data.contract as Contract };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function deleteContract(id: string): Promise<{ error?: string; ok?: boolean }> {
  try {
    const res = await fetch(`${API_URL}/admin/contracts/${encodeURIComponent(id)}`, {
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
