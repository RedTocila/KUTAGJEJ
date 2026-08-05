import * as React from 'react';

import { MemberProfileSkeleton } from '@/components/public/member-profile-skeleton';
import { PublicShell } from '@/components/public/public-shell';

export default function Loading(): React.JSX.Element {
  return (
    <PublicShell hideHeader>
      <MemberProfileSkeleton />
    </PublicShell>
  );
}
