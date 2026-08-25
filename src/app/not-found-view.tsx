'use client';

import { AppErrorPage } from '@/components/common/app-error-page';

export function NotFoundView() {
  return (
    <AppErrorPage
      imageSrc="/assets/error-404.png"
      imageAlt="Page not found"
      title="404: The page you are looking for isn't here"
      description="You either tried some shady route or you came here by mistake. Whichever it is, try using the navigation."
      onReload={() => {
        window.location.reload();
      }}
    />
  );
}
