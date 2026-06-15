'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Badge,
  Box,
  Divider,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { Funnel as FunnelIcon } from '@phosphor-icons/react/dist/ssr/Funnel';
import { SortAscending as SortAscIcon } from '@phosphor-icons/react/dist/ssr/SortAscending';
import { SortDescending as SortDescIcon } from '@phosphor-icons/react/dist/ssr/SortDescending';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import type { HomeVerticalId } from '@/lib/home-categories';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import {
  buildBrowseUrlQuery,
  countActiveBrowseFilters,
  getActiveFilterChips,
  hasActiveBrowseFilters,
  parseBrowseSearchParams,
  removeBrowseFilterKey,
  searchParamsToRecord,
  type BrowseFilters,
  type BrowseRealEstateFilters,
} from '@/lib/listing-filters';
import type { RealEstateCityDto } from '@/lib/real-estate-locations-client';

import { ActiveFilterChips } from './active-filter-chips';
import { FilterDrawerPanel } from './filter-drawer';
import { LocationSearchInput } from './location-search-input';

const toolbarRowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.75,
  minHeight: 36,
  py: 0.25,
} as const;

const pillSx = {
  flexShrink: 0,
  borderRadius: 999,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
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
    setDraft((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const applyDraft = (next: BrowseFilters, closePanel = false) => {
    router.push(`${pathname}${buildBrowseUrlQuery(next)}`);
    if (closePanel) setOpen(false);
  };

  const apply = () => applyDraft(draft, true);
  const clear = () => {
    router.push(pathname);
    setOpen(false);
  };

  const removeChip = (key: string) => {
    const next = removeBrowseFilterKey(applied, key);
    router.push(`${pathname}${buildBrowseUrlQuery(next)}`);
  };


  const activeCount = countActiveBrowseFilters(applied);
  const activeChips = getActiveFilterChips(verticalId, applied);
  const hasPendingChanges = !filtersEqual(draft, applied);
  const sortValue = (draft as { sort?: string }).sort ?? 'newest';
  const cityValue = (draft as { city?: string }).city ?? '';
  const zoneValue = verticalId === 'real-estate' ? ((draft as BrowseRealEstateFilters).zone ?? []) : [];

  const applyLocation = (nextCity?: string, nextZones?: string[]) => {
    if (verticalId === 'real-estate') {
      const next = {
        ...draft,
        city: nextCity || undefined,
        zone: nextZones?.length ? nextZones : undefined,
      } as BrowseFilters;
      setDraft(next);
      applyDraft(next);
      return;
    }
    const next = { ...draft, city: nextCity || undefined } as BrowseFilters;
    setDraft(next);
    applyDraft(next);
  };

  return (
    <>
      <Box component="section" aria-label="Kontrollet e kërkimit" sx={{ mt: { xs: 1.25, md: 2 } }}>
        <Box sx={toolbarRowSx}>
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
                top: 4,
                right: 4,
              },
            }}
          >
            <IconButton
              onClick={() => setOpen(true)}
              aria-label="Hap filtrat"
              sx={{
                ...pillSx,
                width: 36,
                height: 32,
                color: activeCount > 0 ? 'primary.contrastText' : 'text.primary',
                bgcolor: activeCount > 0 ? 'primary.main' : 'background.paper',
                '&:hover': {
                  bgcolor: activeCount > 0 ? 'primary.dark' : primaryMainAlpha(0.08),
                },
              }}
            >
              <FunnelIcon size={16} weight="duotone" />
            </IconButton>
          </Badge>

          <Box sx={{ flex: 1, minWidth: 0, display: 'flex' }}>
            <LocationSearchInput
              cities={cities}
              cityId={cityValue || undefined}
              zoneIds={zoneValue}
              enableZones={verticalId === 'real-estate'}
              placeholder={verticalId === 'real-estate' ? 'Qyteti ose zona' : 'Qyteti'}
              onChange={applyLocation}
            />
          </Box>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ height: 20, alignSelf: 'center', borderColor: 'divider', flexShrink: 0 }}
          />

          <ToggleButtonGroup
            exclusive
            size="small"
            value={sortValue}
            onChange={(_, value) => {
              if (!value) return;
              const next = { ...draft, sort: value === 'newest' ? undefined : value } as BrowseFilters;
              setDraft(next);
              applyDraft(next);
            }}
            sx={{
              ...pillSx,
              flexShrink: 0,
              p: 0.2,
              gap: 0,
              '& .MuiToggleButton-root': {
                width: 32,
                height: 28,
                p: 0,
                border: 'none',
                borderRadius: '999px !important',
                color: 'text.secondary',
                '&.Mui-selected': {
                  bgcolor: primaryMainAlpha(0.14),
                  color: 'primary.main',
                },
              },
            }}
          >
            <ToggleButton value="newest" aria-label="Më të rejat">
              <SparkleIcon size={14} />
            </ToggleButton>
            <ToggleButton value="price-asc" aria-label="Çmimi rritës">
              <SortAscIcon size={14} />
            </ToggleButton>
            <ToggleButton value="price-desc" aria-label="Çmimi zbritës">
              <SortDescIcon size={14} />
            </ToggleButton>
          </ToggleButtonGroup>
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
        hasPendingChanges={hasPendingChanges}
        hasAppliedFilters={hasActiveBrowseFilters(applied)}
        onApply={apply}
        onClear={clear}
      />
    </>
  );
}
