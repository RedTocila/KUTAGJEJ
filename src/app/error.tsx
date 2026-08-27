'use client';

import * as React from 'react';

import { AppErrorPage } from '@/components/common/app-error-page';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppErrorPage
      statusCode="500"
      title="Diçka shkoi keq"
      description="Ndodhi një problem gjatë ngarkimit të faqes. Provoni ta rifreskoni për të vazhduar."
      reloadLabel="Rifresko"
      onReload={reset}
    />
  );
}
