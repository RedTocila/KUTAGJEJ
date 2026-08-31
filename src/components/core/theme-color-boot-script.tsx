'use client';

import * as React from 'react';
import { useServerInsertedHTML } from 'next/navigation';

export function ThemeColorBootScript() {
  useServerInsertedHTML(() => <script src="/theme-color-boot.js" />);

  return null;
}
