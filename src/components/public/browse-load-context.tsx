'use client';

import * as React from 'react';

export type BrowseResolvedMeta = {
  total: number;
  shownCount: number;
  totalPages: number;
  page: number;
  ok: boolean;
};

type BrowseLoadContextValue = {
  /** SSR returned nothing we can trust — first paint must not be the empty state. */
  recoverEmpty: boolean;
  reportResolved: (meta: BrowseResolvedMeta) => void;
};

const BrowseLoadContext = React.createContext<BrowseLoadContextValue | null>(null);

export function BrowseLoadProvider({
  recoverEmpty,
  reportResolved,
  children,
}: BrowseLoadContextValue & { children: React.ReactNode }) {
  const value = React.useMemo(
    () => ({ recoverEmpty, reportResolved }),
    [recoverEmpty, reportResolved],
  );
  return <BrowseLoadContext.Provider value={value}>{children}</BrowseLoadContext.Provider>;
}

export function useBrowseLoadContext() {
  return React.useContext(BrowseLoadContext);
}
