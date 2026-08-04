'use client';

import { useLanguage } from '@/hooks/use-language';
import { getMessages, type AppMessages } from '@/lib/i18n/messages';

/** Localized UI copy for the active language. */
export function useCopy(): AppMessages {
  const { language } = useLanguage();
  return getMessages(language);
}
