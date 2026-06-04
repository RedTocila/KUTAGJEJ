'use client';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;

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
    const res = await fetch(`${API_URL}/business-reservations`, {
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
