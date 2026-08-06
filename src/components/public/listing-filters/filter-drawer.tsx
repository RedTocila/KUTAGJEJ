'use client';

import * as React from 'react';
import { Box, Grid, IconButton, Stack, Typography } from '@mui/material';
import { Funnel as FunnelIcon } from '@phosphor-icons/react/dist/ssr/Funnel';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import type { HomeVerticalId } from '@/lib/home-categories';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { getFilterFieldConfig, type BrowseFilters } from '@/lib/listing-filters';
import type { RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';

import {
  FilterNumberField,
  FilterSection,
  FilterSelect,
  PriceRangeFields,
} from './filter-primitives';
import { FilterQuickPicks, getPrimaryFilterKey, getPrimaryFilterValue } from './filter-quick-picks';
import { LocationSearchInput } from './location-search-input';
import { VehicleTypePicker } from '@/components/cars/vehicle-type-picker';
import type { VehicleType } from '@/lib/car-constants';
import {
  CAR_KM_PRESETS,
  CAR_PRICE_PRESETS,
  CAR_TRANSMISSION_VISUAL,
  CAR_YEAR_MIN_PRESETS,
  FilterBedroomPicker,
  FilterChoiceCards,
  FilterOptionTiles,
  FilterPresetChips,
  FilterSegmented,
  JOB_WORK_LOCATION_VISUAL,
  MARKETPLACE_PRICE_PRESETS,
  REAL_ESTATE_PRICE_PRESETS,
  REAL_ESTATE_SURFACE_PRESETS,
  REAL_ESTATE_TX_VISUAL,
} from './filter-visuals';

export function VerticalFilterSections({
  verticalId,
  draft,
  setField,
  cities,
  cityId,
  zoneIds,
  onLocationChange,
}: {
  verticalId: HomeVerticalId;
  draft: BrowseFilters;
  setField: (key: string, value: string) => void;
  cities: RealEstateCityDto[];
  cityId?: string;
  zoneIds?: string[];
  onLocationChange: (nextCityId?: string, nextZoneIds?: string[]) => void;
}) {
  const locationSection = (
    <FilterSection title="Vendndodhja" index={99}>
      <Grid size={{ xs: 12 }}>
        <LocationSearchInput
          cities={cities}
          cityId={cityId}
          zoneIds={zoneIds}
          enableZones={verticalId === 'real-estate'}
          placeholder={verticalId === 'real-estate' ? 'Qyteti ose zona' : 'Qyteti'}
          onChange={onLocationChange}
        />
      </Grid>
    </FilterSection>
  );
  const config = getFilterFieldConfig(verticalId);
  const primaryKey = getPrimaryFilterKey(verticalId);
  const primaryValue = getPrimaryFilterValue(verticalId, draft as Record<string, string | undefined>);

  const quickPicks = (
    <Box
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 3.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <FilterQuickPicks
        verticalId={verticalId}
        selectedValue={primaryValue}
        onSelect={(v) => setField(primaryKey, v)}
      />
    </Box>
  );

  switch (verticalId) {
    case 'real-estate': {
      const f = draft as import('@/lib/listing-filters').BrowseRealEstateFilters;
      const cfg = config as ReturnType<typeof getFilterFieldConfig> & {
        categories: { value: string; label: string }[];
      };
      return (
        <Stack spacing={2}>
          {quickPicks}
          {locationSection}
          <FilterSection title="Më shumë lloje" index={0}>
            <FilterSelect
              label="Të gjitha llojet e pronës"
              value={f.cat ?? ''}
              onChange={(v) => setField('cat', v)}
              options={cfg.categories}
              gridSize={{ xs: 12 }}
            />
          </FilterSection>
          <FilterSection title="Transaksioni" index={1}>
            <FilterChoiceCards
              value={f.tx ?? ''}
              onChange={(v) => setField('tx', v)}
              options={REAL_ESTATE_TX_VISUAL}
              columns={2}
            />
          </FilterSection>
          <FilterSection title="Dhoma gjumi" index={2}>
            <FilterBedroomPicker value={f.bedrooms ?? ''} onChange={(v) => setField('bedrooms', v)} />
          </FilterSection>
          <FilterSection title="Çmimi & sipërfaqja" index={3}>
            <FilterPresetChips
              value={f.maxPrice ?? ''}
              onChange={(v) => setField('maxPrice', v)}
              presets={REAL_ESTATE_PRICE_PRESETS}
              suffix=" €"
            />
            <PriceRangeFields
              minValue={f.minPrice ?? ''}
              maxValue={f.maxPrice ?? ''}
              onMinChange={(v) => setField('minPrice', v)}
              onMaxChange={(v) => setField('maxPrice', v)}
            />
            <FilterPresetChips
              value={f.minSurface ?? ''}
              onChange={(v) => setField('minSurface', v)}
              presets={REAL_ESTATE_SURFACE_PRESETS}
              suffix=" m²"
            />
            <FilterNumberField label="Sipërfaqe min (m²)" value={f.minSurface ?? ''} onChange={(v) => setField('minSurface', v)} />
          </FilterSection>
        </Stack>
      );
    }
    case 'cars': {
      const f = draft as import('@/lib/listing-filters').BrowseCarFilters;
      const cfg = config as ReturnType<typeof getFilterFieldConfig> & {
        fuelTypes: ReadonlyArray<{ value: string; label: string }>;
        makesForType: (type: string) => { value: string; label: string }[];
        modelsForTypeMake: (type: string, make: string) => { value: string; label: string }[];
      };
      const makeOptions = f.type ? cfg.makesForType(f.type) : [];
      const modelOptions = f.type && f.make ? cfg.modelsForTypeMake(f.type, f.make) : [];
      return (
        <Stack spacing={2}>
          <Box
            sx={{
              p: 2,
              mb: 0,
              borderRadius: 3.5,
              border: '1px solid',
              borderColor: f.type ? 'primary.main' : 'divider',
              bgcolor: f.type ? primaryMainAlpha(0.06) : 'background.paper',
              boxShadow: f.type ? `inset 0 0 0 1px ${primaryMainAlpha(0.15)}` : 'none',
            }}
          >
            <VehicleTypePicker
              label="Lloji i mjetit"
              value={(f.type as VehicleType) || ''}
              allowClear
              size="compact"
              onChange={(v) => setField('type', v)}
            />
          </Box>
          {locationSection}
          <FilterSection title="Transmisioni" index={0}>
            <FilterSegmented
              value={f.transmission ?? ''}
              onChange={(v) => setField('transmission', v)}
              options={CAR_TRANSMISSION_VISUAL}
            />
          </FilterSection>
          <FilterSection title="Marka & modeli" index={1}>
            <FilterSelect
              label="Marka"
              value={f.make ?? ''}
              onChange={(v) => {
                setField('make', v);
                setField('model', '');
              }}
              options={makeOptions}
              emptyLabel={f.type ? 'Të gjitha' : 'Zgjidh kategorinë fillimisht'}
              disabled={!f.type}
            />
            <FilterSelect
              label="Modeli"
              value={f.model ?? ''}
              onChange={(v) => setField('model', v)}
              options={modelOptions}
              emptyLabel={f.make ? 'Të gjitha' : 'Zgjidh markën fillimisht'}
              disabled={!f.make}
            />
          </FilterSection>
          <FilterSection title="Karburanti" index={2}>
            <FilterSelect
              label="Karburanti"
              value={f.fuel ?? ''}
              onChange={(v) => setField('fuel', v)}
              options={[...cfg.fuelTypes]}
              gridSize={{ xs: 12 }}
            />
          </FilterSection>
          <FilterSection title="Çmimi" index={3}>
            <FilterPresetChips
              value={f.maxPrice ?? ''}
              onChange={(v) => setField('maxPrice', v)}
              presets={CAR_PRICE_PRESETS}
              suffix=" €"
            />
            <PriceRangeFields
              minValue={f.minPrice ?? ''}
              maxValue={f.maxPrice ?? ''}
              onMinChange={(v) => setField('minPrice', v)}
              onMaxChange={(v) => setField('maxPrice', v)}
            />
          </FilterSection>
          <FilterSection title="Viti & kilometrazhi" index={4}>
            <FilterPresetChips
              value={f.minYear ?? ''}
              onChange={(v) => setField('minYear', v)}
              presets={CAR_YEAR_MIN_PRESETS}
            />
            <FilterPresetChips
              value={f.maxKm ?? ''}
              onChange={(v) => setField('maxKm', v)}
              presets={CAR_KM_PRESETS}
              suffix=" km"
            />
            <FilterNumberField label="Viti min" value={f.minYear ?? ''} onChange={(v) => setField('minYear', v)} />
            <FilterNumberField label="Viti max" value={f.maxYear ?? ''} onChange={(v) => setField('maxYear', v)} />
            <FilterNumberField label="Km max" value={f.maxKm ?? ''} onChange={(v) => setField('maxKm', v)} />
          </FilterSection>
        </Stack>
      );
    }
    case 'jobs': {
      const f = draft as import('@/lib/listing-filters').BrowseJobFilters;
      const cfg = config as ReturnType<typeof getFilterFieldConfig> & {
        industries: readonly { value: string; label: string }[];
        jobTypes: readonly { value: string; label: string }[];
        educationLevels: readonly { value: string; label: string }[];
        experienceLevels: readonly { value: string; label: string }[];
      };
      return (
        <Stack spacing={2}>
          {quickPicks}
          {locationSection}
          <FilterSection title="Më shumë industri" index={0}>
            <FilterSelect label="Të gjitha industritë" value={f.industry ?? ''} onChange={(v) => setField('industry', v)} options={cfg.industries} gridSize={{ xs: 12 }} />
          </FilterSection>
          <FilterSection title="Lokacioni i punës" index={1}>
            <FilterChoiceCards
              value={f.workLocation ?? ''}
              onChange={(v) => setField('workLocation', v)}
              options={JOB_WORK_LOCATION_VISUAL}
              columns={3}
            />
          </FilterSection>
          <FilterSection title="Lloji i punës" index={2}>
            <FilterOptionTiles
              value={f.jobType ?? ''}
              onChange={(v) => setField('jobType', v)}
              options={cfg.jobTypes}
            />
          </FilterSection>
          <FilterSection title="Kualifikimet" index={3}>
            <FilterOptionTiles
              value={f.experience ?? ''}
              onChange={(v) => setField('experience', v)}
              options={cfg.experienceLevels}
            />
            <FilterSelect label="Arsimi" value={f.education ?? ''} onChange={(v) => setField('education', v)} options={cfg.educationLevels} />
          </FilterSection>
        </Stack>
      );
    }
    case 'marketplace': {
      const f = draft as import('@/lib/listing-filters').BrowseMarketplaceFilters;
      const cfg = config as ReturnType<typeof getFilterFieldConfig> & {
        categories: readonly { value: string; label: string }[];
        conditions: readonly { value: string; label: string }[];
      };
      return (
        <Stack spacing={2}>
          {quickPicks}
          {locationSection}
          <FilterSection title="Më shumë kategori" index={0}>
            <FilterSelect label="Të gjitha kategoritë" value={f.cat ?? ''} onChange={(v) => setField('cat', v)} options={cfg.categories} gridSize={{ xs: 12 }} />
          </FilterSection>
          <FilterSection title="Gjendja" index={1}>
            <FilterOptionTiles
              value={f.condition ?? ''}
              onChange={(v) => setField('condition', v)}
              options={cfg.conditions.map((c) => ({
                value: c.value,
                label: c.label.replace(/\s*\(.*\)$/, ''),
              }))}
            />
          </FilterSection>
          <FilterSection title="Çmimi" index={2}>
            <FilterPresetChips
              value={f.maxPrice ?? ''}
              onChange={(v) => setField('maxPrice', v)}
              presets={MARKETPLACE_PRICE_PRESETS}
              suffix=" €"
            />
            <PriceRangeFields
              minValue={f.minPrice ?? ''}
              maxValue={f.maxPrice ?? ''}
              onMinChange={(v) => setField('minPrice', v)}
              onMaxChange={(v) => setField('maxPrice', v)}
            />
          </FilterSection>
        </Stack>
      );
    }
    case 'businesses':
    case 'professionals': {
      const f = draft as import('@/lib/listing-filters').BrowseDirectoryFilters;
      const cfg = config as ReturnType<typeof getFilterFieldConfig> & {
        types: readonly { value: string; label: string }[];
      };
      return (
        <Stack spacing={2}>
          {quickPicks}
          {locationSection}
          <FilterSection title="Kategoria" index={0}>
            <FilterOptionTiles
              value={f.type ?? ''}
              onChange={(v) => setField('type', v)}
              options={cfg.types}
            />
          </FilterSection>
        </Stack>
      );
    }
    default:
      return null;
  }
}

export function FilterDrawerPanel({
  open,
  onClose,
  verticalId,
  draft,
  setField,
  cities,
  cityId,
  zoneIds,
  onLocationChange,
  hasPendingChanges,
  hasAppliedFilters,
  onApply,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  verticalId: HomeVerticalId;
  draft: BrowseFilters;
  setField: (key: string, value: string) => void;
  cities: RealEstateCityDto[];
  cityId?: string;
  zoneIds?: string[];
  onLocationChange: (nextCityId?: string, nextZoneIds?: string[]) => void;
  hasPendingChanges: boolean;
  hasAppliedFilters: boolean;
  onApply: () => void;
  onClear: () => void;
}) {
  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useLockBodyScroll(open);

  return (
    <>
      <Box
        aria-hidden
        onClick={onClose}
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 1299,
          bgcolor: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          touchAction: 'none',
          transition: 'opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      <Box
        role="dialog"
        aria-modal="true"
        aria-label="Paneli i filtrave"
        data-scroll-lock-allow=""
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 1300,
          width: { xs: 'min(100vw, 420px)', sm: 440, md: 460 },
          maxWidth: '100vw',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          borderRight: '1px solid',
          borderColor: 'divider',
          boxShadow: '32px 0 80px rgba(0,0,0,0.45)',
          transform: open ? 'translateX(0)' : 'translateX(-105%)',
          pointerEvents: open ? 'auto' : 'none',
          transition: 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)',
          overflow: 'hidden',
          overscrollBehavior: 'contain',
        }}
      >
        <Box
          sx={{
            px: 2.5,
            pt: 2.5,
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  flexShrink: 0,
                  boxShadow: `0 4px 16px ${primaryMainAlpha(0.45)}`,
                }}
              >
                <FunnelIcon size={20} weight="bold" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  Refino kërkimin
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mt: 0.25 }}>
                  Përshtat kriteret për rezultate më të sakta
                </Typography>
              </Box>
            </Stack>
            <IconButton
              onClick={onClose}
              aria-label="Mbyll filtrat"
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'action.hover',
                color: 'text.primary',
                '&:hover': { bgcolor: primaryMainAlpha(0.1) },
              }}
            >
              <XIcon size={16} weight="bold" />
            </IconButton>
          </Stack>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2.5, scrollbarWidth: 'thin' }}>
          <VerticalFilterSections
            verticalId={verticalId}
            draft={draft}
            setField={setField}
            cities={cities}
            cityId={cityId}
            zoneIds={zoneIds}
            onLocationChange={onLocationChange}
          />
        </Box>

        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
          }}
        >
          {hasPendingChanges ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25, fontSize: '0.75rem' }}>
              Ke ndryshime të paaplikuara
            </Typography>
          ) : null}
          <Stack spacing={1}>
            <Box
              component="button"
              type="button"
              onClick={onApply}
              sx={{
                width: '100%',
                py: 1.5,
                borderRadius: 999,
                border: 'none',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontWeight: 800,
                fontSize: '0.95rem',
                letterSpacing: '-0.01em',
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: `0 4px 20px ${primaryMainAlpha(0.45)}`,
                transition: 'transform 0.15s, box-shadow 0.15s',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: `0 6px 28px ${primaryMainAlpha(0.55)}`,
                },
                '&:active': { transform: 'translateY(0)' },
              }}
            >
              Shfaq rezultatet
            </Box>
            {hasAppliedFilters ? (
              <Box
                component="button"
                type="button"
                onClick={onClear}
                sx={{
                  width: '100%',
                  py: 1,
                  borderRadius: 999,
                  border: 'none',
                  bgcolor: 'transparent',
                  color: 'text.secondary',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'color 0.15s',
                  '&:hover': { color: 'text.primary' },
                }}
              >
                Pastro filtrat
              </Box>
            ) : null}
          </Stack>
        </Box>
      </Box>
    </>
  );
}
