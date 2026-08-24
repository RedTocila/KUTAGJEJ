'use client';

import * as React from 'react';

import { PostListingAiAssist } from '@/components/user/post-listing-ai-assist';
import type { ListingCategoryKey } from '@/types/listing-category';

/** Shared AI edit button + drawer for owner-edit screens. */
export function OwnerEditAiAssist({
  category,
  currentListing,
  onApply,
}: {
  category: ListingCategoryKey;
  currentListing: Record<string, unknown>;
  onApply: (next: Record<string, unknown>) => void;
}) {
  return (
    <PostListingAiAssist
      mode="edit"
      category={category}
      currentListing={currentListing}
      onApply={onApply}
    />
  );
}
