'use client';

import * as React from 'react';

import { isNativeApp } from '@/lib/native-app';

const subscribe = () => () => {};

/** True inside the Capacitor iOS/Android shell; always false during SSR and on the web. */
export function useIsNativeApp(): boolean {
  return React.useSyncExternalStore(subscribe, isNativeApp, () => false);
}
