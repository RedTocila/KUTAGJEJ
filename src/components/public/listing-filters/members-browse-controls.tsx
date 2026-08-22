'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Box } from '@mui/material';

import { ActiveFilterChips } from '@/components/public/listing-filters/active-filter-chips';
import { ListingKeywordSearchInput } from '@/components/public/listing-filters/listing-keyword-search-input';
import {
  PRODUCT_BROWSE_CONTROL_HEIGHT,
} from '@/components/public/product-browse-chrome';
import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import { localizeSearchCategory, PROFILES_ACCENT, PROFILES_ACCENT_SOFT } from '@/lib/home-categories';
import { formatBrowseKeywords, normalizeBrowseKeywords } from '@/lib/listing-filters';

const PROFILES_SEARCH_ACCENT = { color: PROFILES_ACCENT, soft: PROFILES_ACCENT_SOFT } as const;

function buildMembersQuery(keywords: string[]): string {
  const params = new URLSearchParams();
  for (const keyword of keywords) params.append('q', keyword);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

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
  const keywords = React.useMemo(
    () => normalizeBrowseKeywords(searchParams.getAll('q')),
    [searchParams],
  );

  const applyKeywords = React.useCallback(
    (next: string[]) => {
      React.startTransition(() => {
        router.replace(`${pathname}${buildMembersQuery(next)}`, { scroll: false });
      });
    },
    [pathname, router],
  );

  const applyKeyword = React.useCallback(
    (nextQ: string) => {
      const trimmed = nextQ.trim();
      if (!trimmed) return;
      if (keywords.some((item) => item.toLowerCase() === trimmed.toLowerCase())) return;
      applyKeywords([...keywords, trimmed]);
    },
    [applyKeywords, keywords],
  );

  const removeKeyword = (key: string) => {
    const keyword = key.startsWith('q:') ? key.slice('q:'.length) : key;
    applyKeywords(keywords.filter((item) => item.toLowerCase() !== keyword.toLowerCase()));
  };

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
            value={formatBrowseKeywords(keywords)}
            placeholder={placeholder}
            onChange={applyKeyword}
            accent={PROFILES_SEARCH_ACCENT}
            commitToChip
          />
        </Box>
      </Box>

      {keywords.length > 0 ? (
        <Box sx={{ mt: 0.75 }}>
          <ActiveFilterChips
            chips={keywords.map((keyword) => ({ key: `q:${keyword}`, label: keyword }))}
            onRemove={removeKeyword}
            onClearAll={() => applyKeywords([])}
          />
        </Box>
      ) : null}
    </Box>
  );
}
