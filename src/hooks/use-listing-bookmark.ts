'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { useSavedListingsOptional } from '@/contexts/saved-listings-context';
import { useListingSaveCount, useListingSavedState } from '@/hooks/use-listing-saved-state';
import { useUser } from '@/hooks/use-user';
import { nextSaveCount, toggleListingSave, type ListingMetricKind } from '@/lib/listing-metrics';
import { emitHotLeadSave } from '@/lib/listing-hot-lead';
import { paths } from '@/paths';

export function useListingBookmark(
  listingKind: ListingMetricKind,
  listingId: string,
  initial?: { saved?: boolean; saveCount?: number },
) {
  const router = useRouter();
  const { user } = useUser();
  const savedCtx = useSavedListingsOptional();
  const hydratedSaved = useListingSavedState(listingKind, listingId, initial?.saved);
  const cachedCount = useListingSaveCount(
    listingKind,
    listingId,
    initial?.saveCount ?? 0,
    hydratedSaved,
  );
  const [localCount, setLocalCount] = React.useState(initial?.saveCount ?? 0);

  React.useEffect(() => {
    setLocalCount(initial?.saveCount ?? 0);
  }, [listingId]); // eslint-disable-line react-hooks/exhaustive-deps -- stale SSR count must not clobber a toggle

  const saveCount = savedCtx
    ? cachedCount
    : hydratedSaved
      ? Math.max(localCount, 1)
      : localCount;

  const toggleSave = React.useCallback(async () => {
    if (!user) {
      router.push(paths.user.auth);
      return;
    }
    const wasSaved = hydratedSaved;
    const fromCount = saveCount;

    if (savedCtx) {
      await savedCtx.toggleSaved(listingKind, listingId, { fromCount });
      return;
    }

    setLocalCount((count) => Math.max(0, count + (wasSaved ? -1 : 1)));
    const metrics = await toggleListingSave(listingKind, listingId);
    if (metrics) {
      setLocalCount((count) => nextSaveCount(count, metrics));
      if (metrics.saved && !wasSaved) emitHotLeadSave(listingKind, listingId);
    } else setLocalCount((count) => Math.max(0, count + (wasSaved ? 1 : -1)));
  }, [hydratedSaved, listingId, listingKind, router, saveCount, savedCtx, user]);

  return { saved: hydratedSaved, saveCount, toggleSave };
}
