'use client';

import * as React from 'react';

import { GuestGuard } from '@/components/auth/guest-guard';
import { UserAuthView } from '@/components/user/user-auth-view';

export default function UserAuthPage() {
  return (
    <GuestGuard>
      <UserAuthView />
    </GuestGuard>
  );
}
