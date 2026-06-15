'use client';

import { getApiUrl } from '@/lib/api-config';

export interface CreateBusinessReservationInput {
  listingId: string;
  guestName: string;
  guestPhone: string;
  partySize: number;
  reservationDate: string;
  timeSlot: string;
}

export async function createBusinessReservation(
  body: CreateBusinessReservationInput,
): Promise<{ id?: string; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/business-reservations'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Rezervimi dështoi.' };
    return { id: data.reservation?.id as string | undefined };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}
