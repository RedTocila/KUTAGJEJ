'use client';

import * as React from 'react';

import type { HomeVerticalId } from '@/lib/home-categories';
import { recordSearchInterest } from '@/lib/user-interest-history';

/**
 * Records category browse / filter activity for homepage recommendations.
 * Mount once per category page; re-fires when query/city/category change.
 */
export function BrowseInterestTracker({
  verticalId,
  q,
  city,
  category,
}: {
  verticalId: HomeVerticalId;
  q?: string;
  city?: string;
  category?: string;
}) {
  React.useEffect(() => {
    recordSearchInterest({ verticalId, q, city, category });
  }, [verticalId, q, city, category]);

  return null;
}
