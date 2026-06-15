'use client';

import * as React from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import { SlidersHorizontal as SlidersIcon } from '@phosphor-icons/react/dist/ssr/SlidersHorizontal';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import type { HomeVerticalId } from '@/lib/home-categories';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { getFilterFieldConfig, type BrowseFilters } from '@/lib/listing-filters';

import {
  FilterNumberField,
  FilterSection,
  FilterSelect,
  FilterTextField,
  PriceRangeFields,
} from './filter-primitives';
import { FilterQuickPicks, getPrimaryFilterKey, getPrimaryFilterValue } from './filter-quick-picks';

export function VerticalFilterSections({
  verticalId,
  draft,
  setField,
}: {
  verticalId: HomeVerticalId;
  draft: BrowseFilters;
  setField: (key: string, value: string) => void;
}) {
  const config = getFilterFieldConfig(verticalId);
  const primaryKey = getPrimaryFilterKey(verticalId);
  const primaryValue = getPrimaryFilterValue(verticalId, draft as Record<string, string | undefined>);

  const quickPicks = (
    <Box
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 3,
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
        transactions: readonly { value: string; label: string }[];
      };
      return (
        <Stack spacing={2}>
          {quickPicks}
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
            <FilterSelect label="Transaksioni" value={f.tx ?? ''} onChange={(v) => setField('tx', v)} options={cfg.transactions} gridSize={{ xs: 12 }} />
          </FilterSection>
          <FilterSection title="Çmimi & sipërfaqja" index={2}>
            <PriceRangeFields
              minValue={f.minPrice ?? ''}
              maxValue={f.maxPrice ?? ''}
              onMinChange={(v) => setField('minPrice', v)}
              onMaxChange={(v) => setField('maxPrice', v)}
            />
            <FilterNumberField label="Sipërfaqe min (m²)" value={f.minSurface ?? ''} onChange={(v) => setField('minSurface', v)} />
            <FilterNumberField label="Dhoma gjumi (min)" value={f.bedrooms ?? ''} onChange={(v) => setField('bedrooms', v)} />
          </FilterSection>
        </Stack>
      );
    }
    case 'cars': {
      const f = draft as import('@/lib/listing-filters').BrowseCarFilters;
      const cfg = config as ReturnType<typeof getFilterFieldConfig> & {
        fuelTypes: readonly { value: string; label: string }[];
        makes: { value: string; label: string }[];
        transmissions: readonly { value: string; label: string }[];
      };
      return (
        <Stack spacing={2}>
          {quickPicks}
          <FilterSection title="Makina" index={0}>
            <FilterSelect label="Marka" value={f.make ?? ''} onChange={(v) => setField('make', v)} options={cfg.makes} />
            <FilterSelect label="Transmisioni" value={f.transmission ?? ''} onChange={(v) => setField('transmission', v)} options={cfg.transmissions} />
          </FilterSection>
          <FilterSection title="Çmimi & viti" index={1}>
            <PriceRangeFields
              minValue={f.minPrice ?? ''}
              maxValue={f.maxPrice ?? ''}
              onMinChange={(v) => setField('minPrice', v)}
              onMaxChange={(v) => setField('maxPrice', v)}
            />
            <FilterNumberField label="Viti min" value={f.minYear ?? ''} onChange={(v) => setField('minYear', v)} />
            <FilterNumberField label="Viti max" value={f.maxYear ?? ''} onChange={(v) => setField('maxYear', v)} />
            <FilterNumberField label="Kilometra max" value={f.maxKm ?? ''} onChange={(v) => setField('maxKm', v)} />
          </FilterSection>
        </Stack>
      );
    }
    case 'jobs': {
      const f = draft as import('@/lib/listing-filters').BrowseJobFilters;
      const cfg = config as ReturnType<typeof getFilterFieldConfig> & {
        industries: readonly { value: string; label: string }[];
        jobTypes: readonly { value: string; label: string }[];
        workLocations: readonly { value: string; label: string }[];
        educationLevels: readonly { value: string; label: string }[];
        experienceLevels: readonly { value: string; label: string }[];
      };
      return (
        <Stack spacing={2}>
          {quickPicks}
          <FilterSection title="Më shumë industri" index={0}>
            <FilterSelect label="Të gjitha industritë" value={f.industry ?? ''} onChange={(v) => setField('industry', v)} options={cfg.industries} gridSize={{ xs: 12 }} />
          </FilterSection>
          <FilterSection title="Pozicioni" index={1}>
            <FilterSelect label="Lloji i punës" value={f.jobType ?? ''} onChange={(v) => setField('jobType', v)} options={cfg.jobTypes} />
            <FilterSelect label="Lokacioni i punës" value={f.workLocation ?? ''} onChange={(v) => setField('workLocation', v)} options={cfg.workLocations} />
          </FilterSection>
          <FilterSection title="Kualifikimet" index={2}>
            <FilterSelect label="Arsimi" value={f.education ?? ''} onChange={(v) => setField('education', v)} options={cfg.educationLevels} />
            <FilterSelect label="Eksperienca" value={f.experience ?? ''} onChange={(v) => setField('experience', v)} options={cfg.experienceLevels} />
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
          <FilterSection title="Më shumë kategori" index={0}>
            <FilterSelect label="Të gjitha kategoritë" value={f.cat ?? ''} onChange={(v) => setField('cat', v)} options={cfg.categories} gridSize={{ xs: 12 }} />
          </FilterSection>
          <FilterSection title="Artikulli" index={1}>
            <FilterSelect label="Gjendja" value={f.condition ?? ''} onChange={(v) => setField('condition', v)} options={cfg.conditions} gridSize={{ xs: 12 }} />
          </FilterSection>
          <FilterSection title="Çmimi" index={2}>
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
          <FilterSection title="Më shumë kategori" index={0}>
            <FilterSelect label="Të gjitha kategoritë" value={f.type ?? ''} onChange={(v) => setField('type', v)} options={cfg.types} gridSize={{ xs: 12 }} />
          </FilterSection>
          <FilterSection title="Kërko" index={1}>
            <FilterTextField
              label="Emri ose fjalë kyçe"
              placeholder="p.sh. restorant, dizajn…"
              value={f.q ?? ''}
              onChange={(v) => setField('q', v)}
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
  hasPendingChanges: boolean;
  hasAppliedFilters: boolean;
  onApply: () => void;
  onClear: () => void;
}) {
  React.useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

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
          transition: 'opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      <Box
        role="dialog"
        aria-modal="true"
        aria-label="Paneli i filtrave"
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
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: 3,
            background: `linear-gradient(180deg, var(--mui-palette-primary-main), ${primaryMainAlpha(0.15)})`,
          }}
        />

        <Box
          sx={{
            px: 2.5,
            pt: 2.5,
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            background: `linear-gradient(135deg, ${primaryMainAlpha(0.06)} 0%, transparent 60%)`,
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: primaryMainAlpha(0.12),
                  color: 'primary.main',
                  flexShrink: 0,
                }}
              >
                <SlidersIcon size={20} weight="duotone" />
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
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: primaryMainAlpha(0.06) },
              }}
            >
              <XIcon size={18} />
            </IconButton>
          </Stack>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2.5, scrollbarWidth: 'thin' }}>
          <VerticalFilterSections verticalId={verticalId} draft={draft} setField={setField} />
        </Box>

        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: '0 -12px 32px rgba(0,0,0,0.12)',
          }}
        >
          {hasPendingChanges ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25, fontSize: '0.75rem' }}>
              Ke ndryshime të paaplikuara
            </Typography>
          ) : null}
          <Stack direction="row" spacing={1}>
            {hasAppliedFilters ? (
              <Box
                component="button"
                type="button"
                onClick={onClear}
                sx={{
                  flex: 1,
                  py: 1.25,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'transparent',
                  color: 'text.primary',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background-color 0.15s',
                  '&:hover': { bgcolor: primaryMainAlpha(0.05) },
                }}
              >
                Pastro
              </Box>
            ) : null}
            <Box
              component="button"
              type="button"
              onClick={onApply}
              sx={{
                flex: hasAppliedFilters ? 2 : 1,
                py: 1.25,
                borderRadius: 2.5,
                border: 'none',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontWeight: 700,
                fontSize: '0.9rem',
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
          </Stack>
        </Box>
      </Box>
    </>
  );
}
