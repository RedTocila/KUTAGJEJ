'use client';

import * as React from 'react';
import { Box, Grid, IconButton, Portal, Stack, Typography } from '@mui/material';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { Funnel as FunnelIcon } from '@phosphor-icons/react/dist/ssr/Funnel';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import type { HomeVerticalId } from '@/lib/home-categories';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { DIRECTORY_RATING_PRESETS, getFilterFieldConfig, type BrowseFilters } from '@/lib/listing-filters';
import type { RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
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
  ANNOUNCEMENT_FILTER_VISUAL,
  CAR_KM_PRESETS,
  CAR_PRICE_PRESETS,
  CAR_TRANSMISSION_VISUAL,
  CAR_YEAR_MIN_PRESETS,
  DIRECTORY_SORT_VISUAL,
  FAST_RESPONSE_FILTER_VISUAL,
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
  RESERVATIONS_FILTER_VISUAL,
  VERIFIED_FILTER_VISUAL,
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
  const t = useCopy();
  const { language } = useLanguage();
  const locationSection = (
    <FilterSection title={t.browse.location} index={0}>
      <Grid size={{ xs: 12 }}>
        <LocationSearchInput
          cities={cities}
          cityId={cityId}
          zoneIds={zoneIds}
          enableZones={verticalId === 'real-estate'}
          placeholder={verticalId === 'real-estate' ? t.browse.cityOrZone : t.browse.city}
          onChange={onLocationChange}
        />
      </Grid>
    </FilterSection>
  );
  const config = getFilterFieldConfig(verticalId, language);
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

  const verifiedSection = (
    <FilterSection title={t.browse.account} index={10}>
      <FilterChoiceCards
        value={(draft as { verified?: string }).verified ?? ''}
        onChange={(v) => setField('verified', v)}
        options={VERIFIED_FILTER_VISUAL.map((o) => ({
          ...o,
          label: t.browse.verifiedOnly,
          hint: t.browse.verifiedOnlyHint,
        }))}
        columns={1}
      />
    </FilterSection>
  );

  switch (verticalId) {
    case 'real-estate': {
      const f = draft as import('@/lib/listing-filters').BrowseRealEstateFilters;
      return (
        <Stack spacing={2}>
          {quickPicks}
          {locationSection}
          <FilterSection title={t.browse.transaction} index={1}>
            <FilterChoiceCards
              value={f.tx ?? ''}
              onChange={(v) => setField('tx', v)}
              options={REAL_ESTATE_TX_VISUAL.map((o) => ({
                ...o,
                label: o.value === 'rent' ? t.common.forRent : t.common.forSale,
                hint: o.value === 'rent' ? t.browse.monthlyRent : t.browse.purchase,
              }))}
              columns={2}
            />
          </FilterSection>
          <FilterSection title={t.browse.bedrooms} index={2}>
            <FilterBedroomPicker value={f.bedrooms ?? ''} onChange={(v) => setField('bedrooms', v)} />
          </FilterSection>
          <FilterSection title={t.browse.price} index={3}>
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
          </FilterSection>
          <FilterSection title={t.browse.surface} index={4}>
            <FilterPresetChips
              value={f.minSurface ?? ''}
              onChange={(v) => setField('minSurface', v)}
              presets={REAL_ESTATE_SURFACE_PRESETS}
              suffix=" m²"
            />
            <FilterNumberField label={t.browse.minSurface} value={f.minSurface ?? ''} onChange={(v) => setField('minSurface', v)} />
          </FilterSection>
          {verifiedSection}
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
              label={t.browse.vehicleType}
              value={(f.type as VehicleType) || ''}
              allowClear
              size="compact"
              onChange={(v) => setField('type', v)}
            />
          </Box>
          {locationSection}
          <FilterSection title={t.browse.transmission} index={0}>
            <FilterSegmented
              value={f.transmission ?? ''}
              onChange={(v) => setField('transmission', v)}
              options={CAR_TRANSMISSION_VISUAL}
            />
          </FilterSection>
          <FilterSection title={t.browse.makeAndModel} index={1}>
            <FilterSelect
              label={t.browse.make}
              value={f.make ?? ''}
              onChange={(v) => {
                setField('make', v);
                setField('model', '');
              }}
              options={makeOptions}
              emptyLabel={f.type ? t.browse.all : t.browse.pickCategoryFirst}
              disabled={!f.type}
            />
            <FilterSelect
              label={t.browse.model}
              value={f.model ?? ''}
              onChange={(v) => setField('model', v)}
              options={modelOptions}
              emptyLabel={f.make ? t.browse.all : t.browse.pickMakeFirst}
              disabled={!f.make}
            />
          </FilterSection>
          <FilterSection title={t.browse.fuel} index={2}>
            <FilterSelect
              label={t.browse.fuel}
              value={f.fuel ?? ''}
              onChange={(v) => setField('fuel', v)}
              options={[...cfg.fuelTypes]}
              gridSize={{ xs: 12 }}
            />
          </FilterSection>
          <FilterSection title={t.browse.price} index={3}>
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
          <FilterSection title={t.browse.yearAndMileage} index={4}>
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
            <FilterNumberField label={t.browse.minYear} value={f.minYear ?? ''} onChange={(v) => setField('minYear', v)} />
            <FilterNumberField label={t.browse.maxYear} value={f.maxYear ?? ''} onChange={(v) => setField('maxYear', v)} />
            <FilterNumberField label={t.browse.maxKm} value={f.maxKm ?? ''} onChange={(v) => setField('maxKm', v)} />
          </FilterSection>
          {verifiedSection}
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
          <FilterSection title={t.browse.moreIndustries} index={0}>
            <FilterSelect label={t.browse.allIndustries} value={f.industry ?? ''} onChange={(v) => setField('industry', v)} options={cfg.industries} gridSize={{ xs: 12 }} />
          </FilterSection>
          <FilterSection title={t.browse.workLocation} index={1}>
            <FilterChoiceCards
              value={f.workLocation ?? ''}
              onChange={(v) => setField('workLocation', v)}
              options={JOB_WORK_LOCATION_VISUAL}
              columns={3}
            />
          </FilterSection>
          <FilterSection title={t.browse.jobType} index={2}>
            <FilterOptionTiles
              value={f.jobType ?? ''}
              onChange={(v) => setField('jobType', v)}
              options={cfg.jobTypes}
            />
          </FilterSection>
          <FilterSection title={t.browse.qualifications} index={3}>
            <FilterOptionTiles
              value={f.experience ?? ''}
              onChange={(v) => setField('experience', v)}
              options={cfg.experienceLevels}
            />
            <FilterSelect label={t.browse.education} value={f.education ?? ''} onChange={(v) => setField('education', v)} options={cfg.educationLevels} />
          </FilterSection>
          {verifiedSection}
        </Stack>
      );
    }
    case 'marketplace': {
      const f = draft as import('@/lib/listing-filters').BrowseMarketplaceFilters;
      const cfg = config as ReturnType<typeof getFilterFieldConfig> & {
        conditions: readonly { value: string; label: string }[];
      };
      return (
        <Stack spacing={2}>
          {quickPicks}
          {locationSection}
          <FilterSection title={t.browse.condition} index={1}>
            <FilterOptionTiles
              value={f.condition ?? ''}
              onChange={(v) => setField('condition', v)}
              options={cfg.conditions.map((c) => ({
                value: c.value,
                label: c.label.replace(/\s*\(.*\)$/, ''),
              }))}
            />
          </FilterSection>
          <FilterSection title={t.browse.price} index={2}>
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
          {verifiedSection}
        </Stack>
      );
    }
    case 'businesses':
    case 'professionals': {
      const f = draft as import('@/lib/listing-filters').BrowseDirectoryFilters;
      const cfg = config as ReturnType<typeof getFilterFieldConfig> & {
        sortOptions: readonly { value: string; label: string }[];
      };
      return (
        <Stack spacing={2}>
          {quickPicks}
          {locationSection}
          <FilterSection title={t.browse.sort} index={1}>
            <FilterOptionTiles
              value={f.sort && f.sort !== 'newest' ? f.sort : 'newest'}
              onChange={(v) => setField('sort', v === 'newest' ? '' : v)}
              options={cfg.sortOptions.map((o) => {
                const visual = DIRECTORY_SORT_VISUAL.find((item) => item.value === o.value);
                return { value: o.value, label: o.label, Icon: visual?.Icon };
              })}
            />
          </FilterSection>
          <FilterSection title={t.browse.minRating} index={2}>
            <FilterPresetChips
              value={f.minRating ?? ''}
              onChange={(v) => setField('minRating', v)}
              presets={DIRECTORY_RATING_PRESETS}
            />
          </FilterSection>
          <FilterSection title={t.browse.hasAnnouncement} index={3}>
            <FilterChoiceCards
              value={f.announcement ?? ''}
              onChange={(v) => setField('announcement', v)}
              options={ANNOUNCEMENT_FILTER_VISUAL.map((o) => ({
                ...o,
                label: t.browse.hasAnnouncement,
                hint: t.browse.hasAnnouncementHint,
              }))}
              columns={1}
            />
          </FilterSection>
          {verticalId === 'businesses' ? (
            <FilterSection title={t.browse.hasReservations} index={4}>
              <FilterChoiceCards
                value={f.reservations ?? ''}
                onChange={(v) => setField('reservations', v)}
                options={RESERVATIONS_FILTER_VISUAL.map((o) => ({
                  ...o,
                  label: t.browse.hasReservations,
                  hint: t.browse.hasReservationsHint,
                }))}
                columns={1}
              />
            </FilterSection>
          ) : (
            <FilterSection title={t.browse.fastResponse} index={4}>
              <FilterChoiceCards
                value={f.fastResponse ?? ''}
                onChange={(v) => setField('fastResponse', v)}
                options={FAST_RESPONSE_FILTER_VISUAL.map((o) => ({
                  ...o,
                  label: t.browse.fastResponse,
                  hint: t.browse.fastResponseHint,
                }))}
                columns={1}
              />
            </FilterSection>
          )}
          {verifiedSection}
        </Stack>
      );
    }
    default:
      return null;
  }
}

function FilterScrollArea({
  children,
  resetKey,
}: {
  children: React.ReactNode;
  resetKey: string | number | boolean;
}) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = React.useState(false);

  const sync = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollDown(el.scrollHeight - el.clientHeight - el.scrollTop > 12);
  }, []);

  React.useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    el.addEventListener('scroll', sync, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', sync);
    };
  }, [sync, resetKey]);

  return (
    <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
      <Box
        ref={scrollerRef}
        sx={{
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          px: 2.5,
          pt: 2,
          pb: 3,
          scrollbarWidth: 'thin',
        }}
      >
        {children}
      </Box>
      {canScrollDown ? (
        <Box
          aria-hidden
          sx={{
            pointerEvents: 'none',
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 64,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            pb: 0.75,
            background:
              'linear-gradient(to top, rgb(var(--mui-palette-background-defaultChannel) / 1) 28%, rgb(var(--mui-palette-background-defaultChannel) / 0) 100%)',
          }}
        >
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              color: 'primary.main',
              boxShadow: `0 4px 14px ${primaryMainAlpha(0.25)}`,
            }}
          >
            <CaretDownIcon size={14} weight="bold" />
          </Box>
        </Box>
      ) : null}
    </Box>
  );
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
  const t = useCopy();
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

  // Portal to <body>: the browse hero uses transform/will-change on mobile, which
  // would otherwise trap `position:fixed` inside the short header bar.
  return (
    <Portal>
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
        aria-label={t.browse.filtersPanelAria}
        data-scroll-lock-allow=""
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 1300,
          width: { xs: '80vw', sm: 440, md: 460 },
          maxWidth: '100vw',
          height: '100%',
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
          pt: 'env(safe-area-inset-top, 0px)',
          pb: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <Box
          sx={{
            px: 2.5,
            pt: 2.5,
            pb: 2,
            flexShrink: 0,
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
                  {t.browse.refineTitle}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mt: 0.25 }}>
                  {t.browse.refineSubtitle}
                </Typography>
              </Box>
            </Stack>
            <IconButton
              onClick={onClose}
              aria-label={t.browse.closeFiltersAria}
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

        <FilterScrollArea resetKey={`${verticalId}-${open}`}>
          <VerticalFilterSections
            verticalId={verticalId}
            draft={draft}
            setField={setField}
            cities={cities}
            cityId={cityId}
            zoneIds={zoneIds}
            onLocationChange={onLocationChange}
          />
        </FilterScrollArea>

        <Box
          sx={{
            px: 2.5,
            py: 2,
            flexShrink: 0,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
          }}
        >
          {hasPendingChanges ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25, fontSize: '0.75rem' }}>
              {t.browse.pendingChanges}
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
              {t.browse.showResults}
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
                {t.browse.clearFilters}
              </Box>
            ) : null}
          </Stack>
        </Box>
      </Box>
    </Portal>
  );
}
