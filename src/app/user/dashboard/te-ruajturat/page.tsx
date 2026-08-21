'use client';

import { SavedListingsView } from '@/components/user/saved-listings-view';
import { useMainTabsHosted } from '@/components/main-tabs/main-tabs-shell';

export default function UserSavedListingsPage() {
  const hosted = useMainTabsHosted();
  if (hosted) return null;
  return <SavedListingsView />;
}
