'use client';

import { clientFetch } from '@/lib/api-client';
import { AUTH_USER_KEY, readAuthItem } from '@/lib/auth/storage';

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
  /**
   * Listing contact phone (seller number on the ad).
   * Omitted when the current user owns that listing, so Call never dials your own ad.
   */
  listingContactPhone?: string | null;
  /** Pinned to the top of the inbox for the current user. */
  pinned?: boolean;
  /** Thread includes at least one platform reservation request message. */
  hasReservationMessage?: boolean;
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
  if (res.data?.conversation) patchCachedConversationListing(res.data.conversation);
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
  if (res.data?.conversation) patchCachedConversationListing(res.data.conversation);
  return { conversation: res.data?.conversation };
}

const INBOX_CACHE_PREFIX = 'kutagjej-inbox:v1:';
const INBOX_CACHE_TTL_MS = 10 * 60 * 1000;

function currentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = readAuthItem(AUTH_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string };
    return typeof parsed?.id === 'string' && parsed.id ? parsed.id : null;
  } catch {
    return null;
  }
}

function readInboxSession(userId: string): ConversationSummary[] | null {
  try {
    const raw = sessionStorage.getItem(`${INBOX_CACHE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; conversations?: ConversationSummary[] };
    if (!parsed || typeof parsed.at !== 'number' || !Array.isArray(parsed.conversations)) return null;
    if (Date.now() - parsed.at > INBOX_CACHE_TTL_MS) return null;
    return parsed.conversations;
  } catch {
    return null;
  }
}

function writeInboxSession(userId: string, conversations: ConversationSummary[]): void {
  try {
    sessionStorage.setItem(
      `${INBOX_CACHE_PREFIX}${userId}`,
      JSON.stringify({ at: Date.now(), conversations }),
    );
  } catch {
    /* quota / private mode */
  }
}

/** Survives remounts / route changes so Chats paints instantly. */
let cachedInboxConversations: ConversationSummary[] | null = null;
let cachedInboxUserId: string | null = null;
const cachedThreads = new Map<
  string,
  { messages: ConversationMessage[]; conversation: ConversationSummary }
>();
let inboxInflight: Promise<{
  conversations?: ConversationSummary[];
  total?: number;
  error?: string;
}> | null = null;

function hydrateInboxMemory(): ConversationSummary[] | null {
  const userId = currentUserId();
  if (!userId) return cachedInboxConversations;
  if (cachedInboxConversations && cachedInboxUserId === userId) return cachedInboxConversations;
  const stored = readInboxSession(userId);
  if (!stored) return cachedInboxConversations;
  cachedInboxConversations = stored;
  cachedInboxUserId = userId;
  return stored;
}

export function getCachedConversations(): ConversationSummary[] | null {
  return hydrateInboxMemory();
}

export function setCachedConversations(next: ConversationSummary[] | null): void {
  cachedInboxConversations = next;
  const userId = currentUserId();
  cachedInboxUserId = userId;
  if (next && userId) writeInboxSession(userId, next);
}

function patchCachedConversationListing(conversation: ConversationSummary): void {
  const cached = getCachedConversations();
  if (!cached) return;
  const next = cached.map((c) =>
    c.id === conversation.id
      ? {
          ...c,
          listingKind: conversation.listingKind,
          listingId: conversation.listingId,
          listingTitle: conversation.listingTitle,
          listingImageUrl: conversation.listingImageUrl,
          listingContactPhone: conversation.listingContactPhone,
        }
      : c,
  );
  setCachedConversations(next);
  const thread = cachedThreads.get(conversation.id);
  if (thread) {
    cachedThreads.set(conversation.id, {
      messages: thread.messages,
      conversation: {
        ...thread.conversation,
        listingKind: conversation.listingKind,
        listingId: conversation.listingId,
        listingTitle: conversation.listingTitle,
        listingImageUrl: conversation.listingImageUrl,
        listingContactPhone: conversation.listingContactPhone,
      },
    });
  }
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
  const share = page === 1 && limit === 30;
  if (share && inboxInflight) return inboxInflight;

  const request = (async () => {
    const res = await clientFetch<{
      conversations: ConversationSummary[];
      total: number;
    }>(`/conversations?page=${page}&limit=${limit}`);
    if (!res.ok) return { error: res.error ?? 'Nuk u ngarkuan bisedat.' };
    if (res.data?.conversations) {
      setCachedConversations(res.data.conversations);
    }
    return { conversations: res.data?.conversations, total: res.data?.total };
  })();

  if (share) {
    inboxInflight = request.finally(() => {
      inboxInflight = null;
    });
    return inboxInflight;
  }
  return request;
}

/** Warm the inbox cache so opening Chats does not wait on the list fetch. */
export function prefetchConversations(): Promise<ConversationSummary[] | null> {
  const cached = getCachedConversations();
  if (cached) {
    void fetchConversations();
    return Promise.resolve(cached);
  }
  return fetchConversations().then((res) => {
    if (res.error || !res.conversations) return getCachedConversations();
    return res.conversations;
  });
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
  withInquiry?: boolean;
}): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PENDING_CHAT_KEY, JSON.stringify(payload));
}

export function consumePendingListingChat(): {
  listingKind: ConversationListingKind;
  listingId: string;
  withInquiry: boolean;
} | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PENDING_CHAT_KEY);
  sessionStorage.removeItem(PENDING_CHAT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      listingKind?: string;
      listingId?: string;
      withInquiry?: boolean;
    };
    if (!parsed.listingKind || !parsed.listingId) return null;
    return {
      listingKind: parsed.listingKind as ConversationListingKind,
      listingId: parsed.listingId,
      withInquiry: parsed.withInquiry !== false,
    };
  } catch {
    return null;
  }
}
