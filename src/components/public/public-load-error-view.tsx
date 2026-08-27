'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { AppErrorPage } from '@/components/common/app-error-page';

/**
 * Shown when a listing/profile fetch fails transiently (API timeout / 5xx).
 * Do not use for genuine missing resources — those still use the 404 page.
 */
export function PublicLoadErrorView({
  statusCode = '500',
  title = 'Nuk u ngarkua',
  description = 'Lidhja me serverin dështoi përkohësisht. Provoni përsëri.',
}: {
  statusCode?: string | number;
  title?: string;
  description?: string;
  homeHref?: string;
}) {
  const router = useRouter();

  return (
    <AppErrorPage
      statusCode={statusCode}
      title={title}
      description={description}
      reloadLabel="Rifresko"
      onReload={() => {
        router.refresh();
      }}
    />
  );
}
