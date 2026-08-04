import { getApiUrl } from '@/lib/api-config';
import type {
  PublicCarListing,
  PublicDirectoryListing,
  PublicJobListing,
  PublicMarketplaceListing,
  PublicRealEstateListing,
} from '@/lib/public-listings-client';

export type AiSearchItem =
  | { kind: 'real-estate'; listing: PublicRealEstateListing }
  | { kind: 'car'; listing: PublicCarListing }
  | { kind: 'job'; listing: PublicJobListing }
  | { kind: 'marketplace'; listing: PublicMarketplaceListing }
  | { kind: 'businesses'; listing: PublicDirectoryListing }
  | { kind: 'professionals'; listing: PublicDirectoryListing };

export interface AiSearchResult {
  reply: string;
  intent: {
    verticals: string[];
    q: string;
    filters: Record<string, string>;
  };
  items: AiSearchItem[];
  total: number;
}

export async function fetchAiSearch(
  query: string,
  options?: { language?: 'sq' | 'en'; limit?: number; interpretOnly?: boolean },
): Promise<AiSearchResult> {
  const res = await fetch(getApiUrl('/public/ai-search'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      language: options?.language ?? 'sq',
      limit: options?.limit ?? 24,
      interpretOnly: Boolean(options?.interpretOnly),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === 'string' ? data.message : 'AI search failed',
    );
  }

  return {
    reply: typeof data.reply === 'string' ? data.reply : '',
    intent: data.intent ?? { verticals: [], q: '', filters: {} },
    items: Array.isArray(data.items) ? data.items : [],
    total: typeof data.total === 'number' ? data.total : 0,
  };
}
