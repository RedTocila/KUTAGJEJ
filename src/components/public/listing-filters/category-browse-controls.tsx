'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Badge,
  Box,
  IconButton,
} from '@mui/material';
import { Funnel as FunnelIcon } from '@phosphor-icons/react/dist/ssr/Funnel';
import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import { localizeVertical, type HomeVerticalId } from '@/lib/home-categories';
import {
  buildBrowseUrlQuery,
  countActiveBrowseFilters,
  formatBrowseKeywords,
  getActiveFilterChips,
  hasActiveBrowseFilters,
  normalizeZoneIds,
  parseBrowseSearchParams,
  removeBrowseFilterKey,
  searchParamsToRecord,
  type BrowseFilters,
  type BrowseRealEstateFilters,
} from '@/lib/listing-filters';
import type { RealEstateCityDto } from '@/lib/real-estate-locations-client';
import {
  PRODUCT_BROWSE_CONTROL_HEIGHT,
  productFilterButtonSx,
} from '@/components/public/product-browse-chrome';

import { ActiveFilterChips } from './active-filter-chips';
import { FilterDrawerPanel } from './filter-drawer';
import {
  ListingKeywordSearchInput,
} from './listing-keyword-search-input';
import { SubcategoryPills } from '../subcategory-pills';
import { BrowseInterestTracker } from '@/components/public/browse-interest-tracker';

const toolbarRowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.75,
  minHeight: PRODUCT_BROWSE_CONTROL_HEIGHT,
} as const;

function filtersEqual(a: BrowseFilters, b: BrowseFilters): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const av = (a as Record<string, unknown>)[key];
    const bv = (b as Record<string, unknown>)[key];
    if (Array.isArray(av) || Array.isArray(bv)) {
      const aArr = (Array.isArray(av) ? av : []).map(String).sort();
      const bArr = (Array.isArray(bv) ? bv : []).map(String).sort();
      if (aArr.length !== bArr.length || aArr.some((v, i) => v !== bArr[i])) return false;
      continue;
    }
    const as = String(av ?? '').trim();
    const bs = String(bv ?? '').trim();
    if (as !== bs) return false;
  }
  return true;
}

export function CategoryBrowseControls({
  verticalId,
  cities,
}: {
  verticalId: HomeVerticalId;
  cities: RealEstateCityDto[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const t = useCopy();
  const vertical = React.useMemo(
    () => localizeVertical(verticalId, language),
    [verticalId, language],
  );

  const applied = React.useMemo(
    () => parseBrowseSearchParams(verticalId, searchParamsToRecord(searchParams)),
    [verticalId, searchParams],
  );

  const [draft, setDraft] = React.useState<BrowseFilters>(applied);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setDraft(applied);
  }, [applied]);

  const setField = (key: string, value: string) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value || undefined } as Record<string, string | string[] | undefined>;
      if (verticalId === 'cars' && key === 'type') {
        delete next.make;
        delete next.model;
      }
      if (verticalId === 'cars' && key === 'make') {
        delete next.model;
      }
      return next as BrowseFilters;
    });
  };

  const setLocation = React.useCallback(
    (nextCity?: string, nextZones?: string[]) => {
      const normalizedZones = normalizeZoneIds(nextZones);
      setDraft((prev) => {
        if (verticalId === 'real-estate') {
          return {
            ...prev,
            city: nextCity || undefined,
            zone: normalizedZones.length ? normalizedZones : undefined,
          } as BrowseFilters;
        }
        return { ...prev, city: nextCity || undefined } as BrowseFilters;
      });
    },
    [verticalId],
  );

  const applyDraft = (next: BrowseFilters, closePanel = false) => {
    React.startTransition(() => {
      router.replace(`${pathname}${buildBrowseUrlQuery(next)}`, { scroll: false });
    });
    if (closePanel) setOpen(false);
  };

  const apply = () => applyDraft(draft, true);
  const clear = () => {
    React.startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
    setOpen(false);
  };

  const removeChip = (key: string) => {
    const next = removeBrowseFilterKey(applied, key);
    React.startTransition(() => {
      router.replace(`${pathname}${buildBrowseUrlQuery(next)}`, { scroll: false });
    });
  };

  const applyKeyword = React.useCallback(
    (nextQ: string) => {
      const trimmed = nextQ.trim();
      const next = {
        ...applied,
        q: trimmed ? [trimmed] : undefined,
      } as BrowseFilters;
      setDraft(next);
      React.startTransition(() => {
        router.replace(`${pathname}${buildBrowseUrlQuery(next)}`, { scroll: false });
      });
    },
    [applied, pathname, router],
  );

  const activeCount = countActiveBrowseFilters(applied);
  const activeChips = getActiveFilterChips(verticalId, applied, cities, language);
  const hasPendingChanges = !filtersEqual(draft, applied);
  const qValue = formatBrowseKeywords((applied as { q?: string | string[] }).q);
  const cityValue = (draft as { city?: string }).city ?? '';
  const zoneValue =
    verticalId === 'real-estate' ? normalizeZoneIds((draft as BrowseRealEstateFilters).zone) : [];
  const interestCategory =
    (applied as { cat?: string }).cat ??
    (applied as { make?: string }).make ??
    (applied as { industry?: string }).industry ??
    (applied as { type?: string }).type;

  return (
    <>
      <BrowseInterestTracker
        verticalId={verticalId}
        q={qValue || undefined}
        city={(applied as { city?: string }).city}
        category={interestCategory}
      />
      <Box component="section" aria-label={t.browse.searchControlsAria} sx={{ mt: { xs: 1.25, md: 2 } }}>
        <Box sx={toolbarRowSx}>
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex' }}>
            <ListingKeywordSearchInput
              value={qValue}
              placeholder={vertical.searchPlaceholder}
              onChange={applyKeyword}
              commitToChip
              live
            />
          </Box>

          <Badge
            badgeContent={activeCount}
            color="primary"
            invisible={activeCount === 0}
            sx={{
              flexShrink: 0,
              alignSelf: 'center',
              overflow: 'visible',
              '& .MuiBadge-badge': {
                fontSize: '0.625rem',
                fontWeight: 700,
                minWidth: 18,
                height: 18,
                px: 0.5,
                lineHeight: '18px',
                top: 2,
                right: 2,
              },
            }}
          >
            <IconButton
              onClick={() => setOpen(true)}
              aria-label={t.browse.openFiltersAria}
              sx={productFilterButtonSx(activeCount > 0)}
            >
              <FunnelIcon size={16} weight="bold" />
            </IconButton>
          </Badge>
        </Box>

        <Box sx={{ '& > [role=navigation]': { mt: { xs: 1.25, md: 1.5 }, mb: 0 } }}>
          <SubcategoryPills verticalId={verticalId} />
        </Box>

        {activeChips.length > 0 ? (
          <Box sx={{ mt: 0.75 }}>
            <ActiveFilterChips chips={activeChips} onRemove={removeChip} onClearAll={clear} />
          </Box>
        ) : null}
      </Box>

      <FilterDrawerPanel
        open={open}
        onClose={() => setOpen(false)}
        verticalId={verticalId}
        draft={draft}
        setField={setField}
        cities={cities}
        cityId={cityValue || undefined}
        zoneIds={zoneValue}
        onLocationChange={setLocation}
        hasPendingChanges={hasPendingChanges}
        hasAppliedFilters={hasActiveBrowseFilters(applied)}
        onApply={apply}
        onClear={clear}
      />
    </>
  );
}
