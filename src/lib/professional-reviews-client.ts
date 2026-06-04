'use client';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('custom-auth-token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export interface ProfessionalReview {
  id: string;
  listingId: string;
  rating: number;
  comment: string;
  reviewerName: string;
  createdAt: string;
}

export async function listProfessionalReviews(listingId: string): Promise<{
  reviews?: ProfessionalReview[];
  error?: string;
}> {
  try {
    const res = await fetch(
      `${API_URL}/professional-reviews?listingId=${encodeURIComponent(listingId)}`,
      { cache: 'no-store' },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not load reviews.' };
    return { reviews: data.reviews as ProfessionalReview[] };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export async function submitProfessionalReview(
  listingId: string,
  rating: number,
  comment: string,
): Promise<{ review?: ProfessionalReview; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/professional-reviews`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ listingId, rating, comment }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not save review.' };
    return { review: data.review as ProfessionalReview };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}
