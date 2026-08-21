'use client';

import { UserMessagesView } from '@/components/user/messages/user-messages-view';
import { useMainTabsHosted } from '@/components/main-tabs/main-tabs-shell';

export default function UserMessagesPage() {
  const hosted = useMainTabsHosted();
  if (hosted) return null;
  return <UserMessagesView />;
}
