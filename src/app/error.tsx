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
      imageSrc="/assets/error-500.png"
      imageAlt="Error"
      title="500: Something went wrong!"
      description="We apologize for the inconvenience. Please try again later or contact support if the problem persists."
      onReload={reset}
    />
  );
}
