'use client';

import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

export interface BusinessReview {
  id: string;
  listingId: string;
  rating: number;
  comment: string;
  reviewerName: string;
  createdAt: string;
}

export async function listBusinessReviews(listingId: string): Promise<{
  reviews?: BusinessReview[];
  error?: string;
}> {
  try {
    const res = await fetch(
      getApiUrl(`/business-reviews?listingId=${encodeURIComponent(listingId)}`),
      { cache: 'no-store' },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not load reviews.' };
    return { reviews: data.reviews as BusinessReview[] };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export async function submitBusinessReview(
  listingId: string,
  rating: number,
  comment: string,
): Promise<{ review?: BusinessReview; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/business-reviews'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ listingId, rating, comment }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not save review.' };
    return { review: data.review as BusinessReview };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}
