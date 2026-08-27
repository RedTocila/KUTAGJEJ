'use client';

import * as React from 'react';

import { AppErrorPage } from '@/components/common/app-error-page';

export function NotFoundView() {
  return (
    <AppErrorPage
      statusCode="404"
      title="Faqja nuk u gjet"
      description="Faqja që po kërkoni nuk ekziston ose mund të jetë zhvendosur."
      reloadLabel="Rifresko"
      onReload={() => {
        window.location.reload();
      }}
    />
  );
}
