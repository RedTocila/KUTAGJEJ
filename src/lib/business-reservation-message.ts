import {
  sendConversationMessage,
  startConversation,
} from '@/lib/conversations-client';
import { createBusinessReservation } from '@/lib/business-reservations-client';

export type BusinessReservationDraft = {
  listingId: string;
  guestName: string;
  guestPhone: string;
  partySize: number;
  reservationDate: string;
  timeSlot?: string;
  note?: string;
};

const PENDING_RESERVATION_KEY = 'kutagjej-pending-business-reservation';

export function formatBusinessReservationMessage(draft: BusinessReservationDraft): string {
  const dateLabel = (() => {
    const d = new Date(`${draft.reservationDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return draft.reservationDate;
    return d.toLocaleDateString('sq-AL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  })();

  const lines = [
    'Kërkesë rezervimi',
    '',
    `Emri: ${draft.guestName.trim()}`,
    `Telefoni: ${draft.guestPhone.trim()}`,
    `Data: ${dateLabel}`,
  ];
  if (draft.timeSlot?.trim()) {
    lines.push(`Ora: ${draft.timeSlot.trim()}`);
  }
  lines.push(`Mysafirë: ${draft.partySize}`);
  const note = draft.note?.trim();
  if (note) {
    lines.push(`Shënim: ${note}`);
  }
  return lines.join('\n');
}

export function setPendingBusinessReservation(draft: BusinessReservationDraft): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PENDING_RESERVATION_KEY, JSON.stringify(draft));
}

export function consumePendingBusinessReservation(): BusinessReservationDraft | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PENDING_RESERVATION_KEY);
  sessionStorage.removeItem(PENDING_RESERVATION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<BusinessReservationDraft>;
    if (
      !parsed.listingId ||
      !parsed.guestName ||
      !parsed.guestPhone ||
      !parsed.reservationDate ||
      !parsed.partySize
    ) {
      return null;
    }
    return {
      listingId: String(parsed.listingId),
      guestName: String(parsed.guestName),
      guestPhone: String(parsed.guestPhone),
      partySize: Number(parsed.partySize) || 1,
      reservationDate: String(parsed.reservationDate),
      timeSlot: typeof parsed.timeSlot === 'string' ? parsed.timeSlot : '',
      note: typeof parsed.note === 'string' ? parsed.note : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Saves reservation record (owner tab) and opens a listing conversation
 * with the booking details as the first message.
 */
export async function submitBusinessReservationToMessages(
  draft: BusinessReservationDraft,
): Promise<{ conversationId?: string; error?: string }> {
  // Best-effort persist for the owner reservations list.
  await createBusinessReservation({
    listingId: draft.listingId,
    guestName: draft.guestName.trim(),
    guestPhone: draft.guestPhone.trim(),
    partySize: draft.partySize,
    reservationDate: draft.reservationDate,
    timeSlot: draft.timeSlot?.trim() || '',
  });

  const started = await startConversation('businesses', draft.listingId);
  if (started.error || !started.conversation) {
    return { error: started.error ?? 'Nuk u krijua biseda.' };
  }

  const sent = await sendConversationMessage(
    started.conversation.id,
    formatBusinessReservationMessage(draft),
  );
  if (sent.error) {
    return { conversationId: started.conversation.id, error: sent.error };
  }

  return { conversationId: started.conversation.id };
}
