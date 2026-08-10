'use client';

import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';
import type { AddonKind, AddonPackage, AddonPackageInput } from '@/types/addon-package';

export async function listAdminAddonPackages(
  kind?: AddonKind,
): Promise<{ packages?: AddonPackage[]; error?: string }> {
  try {
    const qs = kind ? `?kind=${encodeURIComponent(kind)}` : '';
    const res = await fetch(getApiUrl(`/admin/addon-packages${qs}`), { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' };
    return { packages: data.packages as AddonPackage[] };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function createAddonPackage(
  body: AddonPackageInput,
): Promise<{ package?: AddonPackage; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/admin/addon-packages'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Krijimi dështoi.' };
    return { package: data.package as AddonPackage };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function updateAddonPackage(
  id: string,
  body: Partial<AddonPackageInput>,
): Promise<{ package?: AddonPackage; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/admin/addon-packages/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Përditësimi dështoi.' };
    return { package: data.package as AddonPackage };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function deactivateAddonPackage(id: string): Promise<{ error?: string; ok?: boolean }> {
  try {
    const res = await fetch(getApiUrl(`/admin/addon-packages/${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Çaktivizimi dështoi.' };
    return { ok: true };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
