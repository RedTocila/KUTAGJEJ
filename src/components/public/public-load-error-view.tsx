'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { AppErrorPage } from '@/components/common/app-error-page';
import { paths } from '@/paths';

/**
 * Shown when a listing/profile fetch fails transiently (API timeout / 5xx).
 * Do not use for genuine missing resources — those still use the 404 page.
 */
export function PublicLoadErrorView({
  title = 'Nuk u ngarkua',
  description = 'Lidhja me serverin dështoi përkohësisht. Provoni përsëri.',
  homeHref = paths.home,
}: {
  title?: string;
  description?: string;
  homeHref?: string;
}) {
  const router = useRouter();

  return (
    <AppErrorPage
      imageSrc="/assets/error-500.png"
      imageAlt="Error"
      title={title}
      description={description}
      goBackHref={homeHref}
      reloadLabel="Reload"
      goBackLabel="Go back"
      onReload={() => {
        router.refresh();
      }}
    />
  );
}
