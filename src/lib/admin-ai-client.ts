'use client';

import { clientFetch } from '@/lib/api-client';

export type AdminAiChatRole = 'user' | 'assistant';

export type AdminAiChatMessage = {
  role: AdminAiChatRole;
  content: string;
};

export type AdminAiToolUse = {
  name: string;
  status: 'ok' | 'error' | 'needs_confirmation';
  summary: string;
};

export type AdminAiPendingAction = {
  name: string;
  args: Record<string, unknown>;
  summary: string;
};

export type AdminAiChatResponse = {
  ok: boolean;
  reply: string;
  toolsUsed: AdminAiToolUse[];
  pendingAction: AdminAiPendingAction | null;
};

export type AdminAiAuditRow = {
  id: string;
  adminEmail: string;
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
  createdAt: string;
};

export async function fetchAdminAiStatus(): Promise<{ configured?: boolean; error?: string }> {
  const res = await clientFetch<{ configured?: boolean }>('/admin/ai/status');
  if (!res.ok) return { error: res.error };
  return { configured: Boolean(res.data?.configured) };
}

export async function sendAdminAiChat(body: {
  messages: AdminAiChatMessage[];
  confirmAction?: AdminAiPendingAction | null;
}): Promise<{ data?: AdminAiChatResponse; error?: string }> {
  const res = await clientFetch<{
    ok?: boolean;
    reply?: string;
    toolsUsed?: AdminAiToolUse[];
    pendingAction?: AdminAiPendingAction | null;
    message?: string;
  }>('/admin/ai/chat', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) return { error: res.error };
  return {
    data: {
      ok: res.data?.ok !== false,
      reply: String(res.data?.reply || '').trim() || 'Gati.',
      toolsUsed: Array.isArray(res.data?.toolsUsed) ? res.data.toolsUsed : [],
      pendingAction: res.data?.pendingAction ?? null,
    },
  };
}

export async function fetchAdminAiActions(): Promise<{ actions?: AdminAiAuditRow[]; error?: string }> {
  const res = await clientFetch<{ actions?: Array<Record<string, unknown>>; warning?: string }>(
    '/admin/ai/actions',
  );
  if (!res.ok) return { error: res.error };
  const actions = (res.data?.actions || []).map((row) => ({
    id: String(row.id || ''),
    adminEmail: String(row.admin_email || row.adminEmail || ''),
    tool: String(row.tool || ''),
    args: row.args && typeof row.args === 'object' ? (row.args as Record<string, unknown>) : {},
    ok: row.ok !== false,
    createdAt: String(row.created_at || row.createdAt || ''),
  }));
  return { actions };
}
