'use client';

import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

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
  viewerHasReviewed?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(
      getApiUrl(`/professional-reviews?listingId=${encodeURIComponent(listingId)}`),
      { cache: 'no-store', headers: authHeaders() },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not load reviews.' };
    return {
      reviews: data.reviews as ProfessionalReview[],
      viewerHasReviewed: Boolean(data.viewerHasReviewed),
    };
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
    const res = await fetch(getApiUrl('/professional-reviews'), {
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
