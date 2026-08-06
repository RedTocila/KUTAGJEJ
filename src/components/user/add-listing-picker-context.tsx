'use client';

import * as React from 'react';

import { AddListingPickerDialog } from '@/components/user/add-listing-picker-dialog';
import { useUser } from '@/hooks/use-user';

type AddListingPickerContextValue = {
  openAddListingPicker: () => void;
  /** True while the add-listing sheet is open (hide chrome that would sit under it). */
  addListingPickerOpen: boolean;
};

const AddListingPickerContext = React.createContext<AddListingPickerContextValue | null>(null);

export function useAddListingPicker(): AddListingPickerContextValue {
  const ctx = React.useContext(AddListingPickerContext);
  if (!ctx) {
    throw new Error('useAddListingPicker must be used within AddListingPickerProvider');
  }
  return ctx;
}

/** Optional: returns null outside the provider (e.g. public pages). */
export function useOptionalAddListingPicker(): AddListingPickerContextValue | null {
  return React.useContext(AddListingPickerContext);
}

export function AddListingPickerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [open, setOpen] = React.useState(false);

  const canPublish =
    Boolean(user) &&
    (user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user');

  const openAddListingPicker = React.useCallback(() => {
    if (!canPublish) return;
    setOpen(true);
  }, [canPublish]);

  const value = React.useMemo(
    () => ({ openAddListingPicker, addListingPickerOpen: open }),
    [openAddListingPicker, open],
  );

  return (
    <AddListingPickerContext.Provider value={value}>
      {children}
      {canPublish ? (
        <AddListingPickerDialog open={open} onClose={() => setOpen(false)} />
      ) : null}
    </AddListingPickerContext.Provider>
  );
}
