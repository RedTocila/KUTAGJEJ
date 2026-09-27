'use client';

import { clientFetch } from '@/lib/api-client';
import type { ConversationListingKind } from '@/lib/conversations-client';

export type ReportReason =
  | 'spam'
  | 'scam'
  | 'offensive'
  | 'harassment'
  | 'inappropriate'
  | 'prohibited'
  | 'wrong_category'
  | 'other';

export type ReportTargetType = 'listing' | 'user' | 'message';

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam ose reklamë e padëshiruar',
  scam: 'Mashtrim / njoftim i rremë',
  offensive: 'Përmbajtje fyese ose urrejtje',
  harassment: 'Ngacmim ose kërcënim',
  inappropriate: 'Përmbajtje seksuale ose e papërshtatshme',
  prohibited: 'Produkt ose shërbim i ndaluar',
  wrong_category: 'Kategori ose informacion i gabuar',
  other: 'Tjetër',
};

export const LISTING_REPORT_REASONS: ReportReason[] = [
  'scam',
  'spam',
  'prohibited',
  'offensive',
  'inappropriate',
  'wrong_category',
  'other',
];

export const USER_REPORT_REASONS: ReportReason[] = [
  'harassment',
  'scam',
  'spam',
  'offensive',
  'inappropriate',
  'other',
];

export type ReportPayload =
  | { targetType: 'listing'; listingKind: ConversationListingKind; listingId: string }
  | { targetType: 'user'; reportedUserId?: string; conversationId?: string }
  | { targetType: 'message'; conversationId: string; messageId: string };

export async function submitContentReport(
  payload: ReportPayload & { reason: ReportReason; details?: string },
): Promise<{ ok?: boolean; error?: string; status?: number }> {
  const res = await clientFetch<{ ok: boolean; id: string }>('/moderation/reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) return { error: res.error ?? 'Raportimi nuk u dërgua.', status: res.status };
  return { ok: true };
}

export async function fetchBlockedUserIds(): Promise<{ blockedUserIds?: string[]; error?: string }> {
  const res = await clientFetch<{ blockedUserIds: string[] }>('/moderation/blocks');
  if (!res.ok) return { error: res.error ?? 'Nuk u ngarkuan përdoruesit e bllokuar.' };
  return { blockedUserIds: res.data?.blockedUserIds ?? [] };
}

export async function blockUserRequest(userId: string): Promise<{ error?: string }> {
  const res = await clientFetch('/moderation/blocks', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) return { error: res.error ?? 'Përdoruesi nuk u bllokua.' };
  return {};
}

export async function unblockUserRequest(userId: string): Promise<{ error?: string }> {
  const res = await clientFetch(`/moderation/blocks/${encodeURIComponent(userId)}`, { method: 'DELETE' });
  if (!res.ok) return { error: res.error ?? 'Përdoruesi nuk u zhbllokua.' };
  return {};
}

export type AdminContentReport = {
  id: string;
  targetType: ReportTargetType;
  listingKind: ConversationListingKind | null;
  listingId: string | null;
  listingTitle: string;
  reporterId: string;
  reporterName: string | null;
  reporterEmail: string | null;
  reportedUserId: string | null;
  reportedUserName: string | null;
  reportedUserEmail: string | null;
  conversationId: string | null;
  messageId: string | null;
  messageExcerpt: string;
  reason: ReportReason;
  details: string;
  status: 'open' | 'resolved' | 'dismissed';
  adminNote: string;
  resolvedAt: string | null;
  createdAt: string;
};

export async function fetchAdminReports(
  status: 'open' | 'resolved' | 'dismissed' | 'all',
): Promise<{ reports?: AdminContentReport[]; total?: number; setupPending?: boolean; error?: string }> {
  const res = await clientFetch<{ reports: AdminContentReport[]; total: number; setupPending?: boolean }>(
    `/admin/reports?status=${encodeURIComponent(status)}&limit=100`,
  );
  if (!res.ok) return { error: res.error ?? 'Raportimet nuk u ngarkuan.' };
  return { reports: res.data?.reports ?? [], total: res.data?.total ?? 0, setupPending: res.data?.setupPending };
}

export async function updateAdminReport(
  id: string,
  status: 'open' | 'resolved' | 'dismissed',
  adminNote?: string,
): Promise<{ report?: AdminContentReport; error?: string }> {
  const res = await clientFetch<{ report: AdminContentReport }>(`/admin/reports/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...(adminNote != null ? { adminNote } : null) }),
  });
  if (!res.ok) return { error: res.error ?? 'Raportimi nuk u përditësua.' };
  return { report: res.data?.report };
}
