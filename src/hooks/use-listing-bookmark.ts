'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { useUser } from '@/hooks/use-user';
import { toggleListingSave, type ListingMetricKind } from '@/lib/listing-metrics';
import { paths } from '@/paths';

export function useListingBookmark(
  listingKind: ListingMetricKind,
  listingId: string,
  initial?: { saved?: boolean; saveCount?: number },
) {
  const router = useRouter();
  const { user } = useUser();
  const [saved, setSaved] = React.useState(Boolean(initial?.saved));
  const [saveCount, setSaveCount] = React.useState(initial?.saveCount ?? 0);

  React.useEffect(() => {
    if (initial?.saved !== undefined) setSaved(initial.saved);
  }, [initial?.saved]);

  React.useEffect(() => {
    if (initial?.saveCount !== undefined) setSaveCount(initial.saveCount);
  }, [initial?.saveCount]);

  const toggleSave = React.useCallback(async () => {
    if (!user) {
      router.push(paths.user.auth);
      return;
    }
    const metrics = await toggleListingSave(listingKind, listingId);
    if (metrics) {
      setSaved(metrics.saved);
      setSaveCount(metrics.saveCount);
    }
  }, [listingKind, listingId, router, user]);

  return { saved, saveCount, toggleSave };
}
