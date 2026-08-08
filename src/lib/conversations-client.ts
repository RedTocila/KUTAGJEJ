'use client';

import { clientFetch } from '@/lib/api-client';

export type ConversationListingKind =
  | 'real-estate'
  | 'cars'
  | 'jobs'
  | 'marketplace'
  | 'businesses'
  | 'professionals';

export type ListingMetricKind =
  | 'real-estate'
  | 'car'
  | 'job'
  | 'marketplace'
  | 'businesses'
  | 'professionals';

export function metricKindToConversationKind(kind: ListingMetricKind): ConversationListingKind {
  if (kind === 'car') return 'cars';
  if (kind === 'job') return 'jobs';
  return kind;
}

export function publicListingKindToConversationKind(
  kind: 'real-estate' | 'car' | 'job' | 'marketplace' | 'businesses' | 'professionals',
): ConversationListingKind {
  if (kind === 'car') return 'cars';
  if (kind === 'job') return 'jobs';
  return kind;
}

export interface ConversationSummary {
  id: string;
  listingKind: ConversationListingKind | null;
  listingId: string | null;
  listingTitle: string;
  listingImageUrl: string | null;
  /**
   * Who opened the thread: `inquirer` = contacted from a listing;
   * `poster` = owner outreach (e.g. contact saver) or direct chat.
   */
  startedBy?: 'poster' | 'inquirer';
  role: 'poster' | 'inquirer';
  unreadCount: number;
  /** Unread count on the other participant's side (for delivered/read on my messages). */
  otherUnreadCount?: number;
  lastMessageText: string;
  lastMessageAt: string;
  /** True when the latest message in the thread was sent by the current user. */
  lastMessageIsMine?: boolean;
  otherParticipantId: string;
  otherParticipantModel: 'IndividualUser' | 'BusinessUser';
  otherParticipantName: string | null;
  /** Account phone of the other participant, when available. */
  otherParticipantPhone?: string | null;
  /** Profile avatar of the other participant, when available. */
  otherParticipantAvatarUrl?: string | null;
  /** Listing contact phone (seller number shown on the ad). */
  listingContactPhone?: string | null;
  /** Pinned to the top of the inbox for the current user. */
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderModel: 'IndividualUser' | 'BusinessUser';
  body: string;
  imageUrl?: string | null;
  createdAt: string;
  isMine: boolean;
}

export async function startConversation(
  listingKind: ConversationListingKind,
  listingId: string,
): Promise<{ conversation?: ConversationSummary; error?: string }> {
  const res = await clientFetch<{ conversation: ConversationSummary }>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ listingKind, listingId }),
  });
  if (!res.ok) return { error: res.error ?? 'Nuk u krijua biseda.' };
  return { conversation: res.data?.conversation };
}

export async function startConversationWithMember(
  memberId: string,
  opts?: { listingKind?: string; listingId?: string },
): Promise<{ conversation?: ConversationSummary; error?: string }> {
  const listingKind = opts?.listingKind ? String(opts.listingKind).trim() : '';
  const listingId = opts?.listingId ? String(opts.listingId).trim() : '';
  const res = await clientFetch<{ conversation: ConversationSummary }>(
    `/conversations/with-member/${encodeURIComponent(memberId)}`,
    {
      method: 'POST',
      body: JSON.stringify(
        listingKind && listingId ? { listingKind, listingId } : {},
      ),
    },
  );
  if (!res.ok) return { error: res.error ?? 'Nuk u krijua biseda.' };
  return { conversation: res.data?.conversation };
}

/** Survives remounts / route changes so Chats paints instantly. */
let cachedInboxConversations: ConversationSummary[] | null = null;
const cachedThreads = new Map<
  string,
  { messages: ConversationMessage[]; conversation: ConversationSummary }
>();
let inboxPrefetch: Promise<ConversationSummary[] | null> | null = null;

export function getCachedConversations(): ConversationSummary[] | null {
  return cachedInboxConversations;
}

export function setCachedConversations(next: ConversationSummary[] | null): void {
  cachedInboxConversations = next;
}

export function getCachedThread(conversationId: string): {
  messages: ConversationMessage[];
  conversation: ConversationSummary;
} | null {
  return cachedThreads.get(conversationId) ?? null;
}

export function setCachedThread(
  conversationId: string,
  messages: ConversationMessage[],
  conversation: ConversationSummary,
): void {
  cachedThreads.set(conversationId, { messages, conversation });
}

export function removeCachedThreads(ids: string[]): void {
  for (const id of ids) cachedThreads.delete(id);
}

export async function fetchConversations(
  page = 1,
  limit = 30,
): Promise<{
  conversations?: ConversationSummary[];
  total?: number;
  error?: string;
}> {
  const res = await clientFetch<{
    conversations: ConversationSummary[];
    total: number;
  }>(`/conversations?page=${page}&limit=${limit}`);
  if (!res.ok) return { error: res.error ?? 'Nuk u ngarkuan bisedat.' };
  if (res.data?.conversations) {
    cachedInboxConversations = res.data.conversations;
  }
  return { conversations: res.data?.conversations, total: res.data?.total };
}

/** Warm the inbox cache so opening Chats does not wait on the list fetch. */
export function prefetchConversations(): Promise<ConversationSummary[] | null> {
  if (cachedInboxConversations) return Promise.resolve(cachedInboxConversations);
  if (inboxPrefetch) return inboxPrefetch;
  inboxPrefetch = fetchConversations()
    .then((res) => {
      if (res.error || !res.conversations) return cachedInboxConversations;
      return res.conversations;
    })
    .finally(() => {
      inboxPrefetch = null;
    });
  return inboxPrefetch;
}

export async function fetchUnreadMessagesCount(): Promise<{ unreadCount?: number; error?: string }> {
  const res = await clientFetch<{ unreadCount: number }>('/conversations/unread-count');
  if (!res.ok) return { error: res.error ?? 'Nuk u ngarkua numri i mesazheve.' };
  return { unreadCount: res.data?.unreadCount ?? 0 };
}

export async function fetchConversationMessages(
  conversationId: string,
  opts?: { before?: string; limit?: number },
): Promise<{
  messages?: ConversationMessage[];
  conversation?: ConversationSummary;
  error?: string;
}> {
  const params = new URLSearchParams();
  if (opts?.before) params.set('before', opts.before);
  if (opts?.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();
  const res = await clientFetch<{
    messages: ConversationMessage[];
    conversation: ConversationSummary;
  }>(`/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`);
  if (!res.ok) return { error: res.error ?? 'Nuk u ngarkuan mesazhet.' };
  return { messages: res.data?.messages, conversation: res.data?.conversation };
}

export async function sendConversationMessage(
  conversationId: string,
  body: string,
  imageUrl?: string | null,
): Promise<{ message?: ConversationMessage; error?: string }> {
  const res = await clientFetch<{ message: ConversationMessage }>(
    `/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({
        body,
        ...(imageUrl ? { imageUrl } : null),
      }),
    },
  );
  if (!res.ok) return { error: res.error ?? 'Mesazhi nuk u dërgua.' };
  return { message: res.data?.message };
}

export async function markConversationRead(conversationId: string): Promise<{ error?: string }> {
  const res = await clientFetch(`/conversations/${conversationId}/read`, { method: 'PATCH' });
  if (!res.ok) return { error: res.error ?? 'Nuk u përditësua statusi.' };
  return {};
}

export async function setConversationPinned(
  conversationId: string,
  pinned: boolean,
): Promise<{ conversation?: ConversationSummary; error?: string }> {
  const res = await clientFetch<{ conversation: ConversationSummary }>(
    `/conversations/${encodeURIComponent(conversationId)}/pin`,
    {
      method: 'PATCH',
      body: JSON.stringify({ pinned }),
    },
  );
  if (!res.ok) return { error: res.error ?? 'Nuk u përditësua fiksimi.' };
  return { conversation: res.data?.conversation };
}

export async function hideConversations(
  ids: string[],
): Promise<{ ids?: string[]; error?: string }> {
  const unique = [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))];
  if (unique.length === 1) {
    const res = await clientFetch<{ ok: boolean; id: string }>(
      `/conversations/${encodeURIComponent(unique[0]!)}`,
      { method: 'DELETE' },
    );
    if (!res.ok) return { error: res.error ?? 'Nuk u fshi biseda.' };
    return { ids: res.data?.id ? [res.data.id] : unique };
  }
  const res = await clientFetch<{ ok: boolean; ids: string[] }>('/conversations/hide', {
    method: 'POST',
    body: JSON.stringify({ ids: unique }),
  });
  if (!res.ok) return { error: res.error ?? 'Nuk u fshinë bisedat.' };
  return { ids: res.data?.ids ?? unique };
}

const PENDING_CHAT_KEY = 'kutagjej-pending-listing-chat';

export function setPendingListingChat(payload: {
  listingKind: ConversationListingKind;
  listingId: string;
}): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PENDING_CHAT_KEY, JSON.stringify(payload));
}

export function consumePendingListingChat(): {
  listingKind: ConversationListingKind;
  listingId: string;
} | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PENDING_CHAT_KEY);
  sessionStorage.removeItem(PENDING_CHAT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { listingKind?: string; listingId?: string };
    if (!parsed.listingKind || !parsed.listingId) return null;
    return {
      listingKind: parsed.listingKind as ConversationListingKind,
      listingId: parsed.listingId,
    };
  } catch {
    return null;
  }
}
