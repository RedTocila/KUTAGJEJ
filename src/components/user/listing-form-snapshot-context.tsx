'use client';

import * as React from 'react';

const ListingFormSnapshotContext = React.createContext<React.MutableRefObject<Record<string, unknown> | null> | null>(
  null,
);

/** Lets the AI assist read the live create-form values without remounting it. */
export function ListingFormSnapshotProvider({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<Record<string, unknown> | null>(null);
  return <ListingFormSnapshotContext.Provider value={ref}>{children}</ListingFormSnapshotContext.Provider>;
}

export function useListingFormSnapshotRef() {
  return React.useContext(ListingFormSnapshotContext);
}

export function usePublishListingFormSnapshot(
  snapshot: Record<string, unknown> | null,
  enabled = true,
) {
  const ref = useListingFormSnapshotRef();

  React.useEffect(() => {
    if (!ref || !enabled) return;
    ref.current = snapshot;
    return () => {
      if (ref.current === snapshot) ref.current = null;
    };
  }, [ref, snapshot, enabled]);
}
