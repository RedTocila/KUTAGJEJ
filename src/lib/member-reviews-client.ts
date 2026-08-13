'use client';

import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

export interface MemberReview {
  id: string;
  memberId: string;
  rating: number;
  comment: string;
  reviewerName: string;
  createdAt: string;
  /** profile = member_reviews; business/professional = directory listing reviews */
  source?: 'profile' | 'business' | 'professional';
  listingId?: string | null;
  listingTitle?: string | null;
}

export async function listMemberReviews(memberId: string): Promise<{
  reviews?: MemberReview[];
  viewerHasReviewed?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(
      getApiUrl(`/member-reviews?memberId=${encodeURIComponent(memberId)}`),
      { cache: 'no-store', headers: authHeaders() },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not load reviews.' };
    return {
      reviews: data.reviews as MemberReview[],
      viewerHasReviewed: Boolean(data.viewerHasReviewed),
    };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export async function submitMemberReview(
  memberId: string,
  rating: number,
  comment: string,
): Promise<{ review?: MemberReview; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/member-reviews'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ memberId, rating, comment }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not save review.' };
    return { review: data.review as MemberReview };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}
