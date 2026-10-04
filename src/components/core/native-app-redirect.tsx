'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { useIsNativeApp } from '@/hooks/use-is-native-app';

/** Sends app users elsewhere for pages the App Store build does not offer. Web is untouched. */
export function NativeAppRedirect({ to }: { to: string }): null {
  const router = useRouter();
  const nativeApp = useIsNativeApp();

  React.useEffect(() => {
    if (nativeApp) router.replace(to);
  }, [nativeApp, router, to]);

  return null;
}
