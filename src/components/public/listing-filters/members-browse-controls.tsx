'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Box } from '@mui/material';

import { ListingKeywordSearchInput } from '@/components/public/listing-filters/listing-keyword-search-input';
import {
  PRODUCT_BROWSE_CONTROL_HEIGHT,
} from '@/components/public/product-browse-chrome';
import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import { localizeSearchCategory, PROFILES_ACCENT, PROFILES_ACCENT_SOFT } from '@/lib/home-categories';

const PROFILES_SEARCH_ACCENT = { color: PROFILES_ACCENT, soft: PROFILES_ACCENT_SOFT } as const;

export function MembersBrowseControls() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const t = useCopy();
  const placeholder = React.useMemo(
    () => localizeSearchCategory('profiles', language).searchPlaceholder,
    [language],
  );
  const appliedQ = searchParams.get('q')?.trim() ?? '';

  const applyKeyword = React.useCallback(
    (nextQ: string) => {
      const trimmed = nextQ.trim();
      React.startTransition(() => {
        if (!trimmed) {
          router.replace(pathname, { scroll: false });
          return;
        }
        const params = new URLSearchParams();
        params.set('q', trimmed);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router],
  );

  return (
    <Box component="section" aria-label={t.browse.searchControlsAria} sx={{ mt: { xs: 1.25, md: 2 } }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          minHeight: PRODUCT_BROWSE_CONTROL_HEIGHT,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex' }}>
          <ListingKeywordSearchInput
            value={appliedQ}
            placeholder={placeholder}
            onChange={applyKeyword}
            accent={PROFILES_SEARCH_ACCENT}
          />
        </Box>
      </Box>
    </Box>
  );
}
