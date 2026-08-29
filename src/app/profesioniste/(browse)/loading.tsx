import * as React from 'react';

import { CategoryBrowseSkeleton } from '@/components/public/category-browse-skeleton';
import { PublicShell } from '@/components/public/public-shell';

export default function Loading(): React.JSX.Element {
  return (
    <PublicShell hideHeaderBelowMd>
      <CategoryBrowseSkeleton cardAspectRatio="1 / 1" />
    </PublicShell>
  );
}
