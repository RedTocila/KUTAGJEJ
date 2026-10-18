'use client';

import { useServerInsertedHTML } from 'next/navigation';

/** Runs before hydration so the theme-color meta matches the saved theme. */
export function ThemeColorBootScript() {
  useServerInsertedHTML(() => <script src="/theme-color-boot.js" defer />);
  return null;
}
