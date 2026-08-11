'use client';

import * as React from 'react';
import { Box, Grid, Typography } from '@mui/material';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { Bed as BedIcon } from '@phosphor-icons/react/dist/ssr/Bed';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { CalendarCheck as CalendarCheckIcon } from '@phosphor-icons/react/dist/ssr/CalendarCheck';
import { Clock as ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { House as HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { Key as KeyIcon } from '@phosphor-icons/react/dist/ssr/Key';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Megaphone as MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';
import { HouseLine as HouseLineIcon } from '@phosphor-icons/react/dist/ssr/HouseLine';
import { GearSix as GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';
import { SteeringWheel as SteeringWheelIcon } from '@phosphor-icons/react/dist/ssr/SteeringWheel';

import { useCopy } from '@/hooks/use-copy';
import { primaryMainAlpha } from '@/lib/css-var-alpha';

type Option = { value: string; label: string; Icon?: PhosphorIcon; hint?: string };

function toggleValue(current: string, next: string): string {
  return current === next ? '' : next;
}

/** Compact segmented control for 2–4 exclusive options. */
export function FilterSegmented({
  value,
  onChange,
  options,
  allowEmpty = true,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly Option[];
  allowEmpty?: boolean;
}) {
  return (
    <Grid size={{ xs: 12 }}>
      <Box
        role="radiogroup"
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${options.length}, 1fr)`,
          gap: 0.75,
          p: 0.5,
          borderRadius: 999,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: primaryMainAlpha(0.04),
        }}
      >
        {options.map((opt) => {
          const active = value === opt.value;
          const Icon = opt.Icon;
          return (
            <Box
              key={opt.value}
              component="button"
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(allowEmpty ? toggleValue(value, opt.value) : opt.value)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.6,
                minHeight: 40,
                px: 1,
                borderRadius: 999,
                border: 'none',
                bgcolor: active ? 'primary.main' : 'transparent',
                color: active ? 'primary.contrastText' : 'text.secondary',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background-color 0.15s, color 0.15s, transform 0.15s',
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: active ? 'primary.main' : primaryMainAlpha(0.1),
                  color: active ? 'primary.contrastText' : 'text.primary',
                },
              }}
            >
              {Icon ? <Icon size={15} weight={active ? 'fill' : 'duotone'} /> : null}
              {opt.label}
            </Box>
          );
        })}
      </Box>
    </Grid>
  );
}

/** Icon + label choice cards in a responsive grid. */
export function FilterChoiceCards({
  value,
  onChange,
  options,
  columns = 2,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly Option[];
  columns?: 1 | 2 | 3;
}) {
  return (
    <Grid size={{ xs: 12 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: 0.85,
        }}
      >
        {options.map((opt) => {
          const active = value === opt.value;
          const Icon = opt.Icon;
          return (
            <Box
              key={opt.value}
              component="button"
              type="button"
              onClick={() => onChange(toggleValue(value, opt.value))}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 0.85,
                p: 1.25,
                minHeight: 76,
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: active ? 'primary.main' : 'divider',
                bgcolor: active ? primaryMainAlpha(0.12) : 'transparent',
                color: 'text.primary',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s, background-color 0.15s, transform 0.15s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: primaryMainAlpha(0.08),
                  transform: 'translateY(-1px)',
                },
              }}
            >
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: active ? 'primary.main' : primaryMainAlpha(0.1),
                  color: active ? 'primary.contrastText' : 'primary.main',
                }}
              >
                {Icon ? <Icon size={16} weight={active ? 'fill' : 'duotone'} /> : null}
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', lineHeight: 1.2 }}>
                  {opt.label}
                </Typography>
                {opt.hint ? (
                  <Typography sx={{ mt: 0.35, fontSize: '0.68rem', color: 'text.secondary', lineHeight: 1.2 }}>
                    {opt.hint}
                  </Typography>
                ) : null}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Grid>
  );
}

/** Compact selectable tiles (labels only, multi-row wrap). */
export function FilterOptionTiles({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly Option[];
}) {
  return (
    <Grid size={{ xs: 12 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {options.map((opt) => {
          const active = value === opt.value;
          const Icon = opt.Icon;
          return (
            <Box
              key={opt.value}
              component="button"
              type="button"
              onClick={() => onChange(toggleValue(value, opt.value))}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.55,
                px: 1.2,
                py: 0.75,
                borderRadius: 2,
                border: '1px solid',
                borderColor: active ? 'primary.main' : 'divider',
                bgcolor: active ? primaryMainAlpha(0.14) : 'transparent',
                color: active ? 'primary.main' : 'text.primary',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: primaryMainAlpha(0.08),
                },
              }}
            >
              {Icon ? <Icon size={14} weight={active ? 'fill' : 'regular'} /> : null}
              {opt.label}
            </Box>
          );
        })}
      </Box>
    </Grid>
  );
}

/** Quick preset chips that set a single numeric field (e.g. max price / min surface). */
export function FilterPresetChips({
  value,
  onChange,
  presets,
  suffix = '',
  prefix = '',
}: {
  value: string;
  onChange: (value: string) => void;
  presets: readonly { value: string; label: string }[];
  suffix?: string;
  prefix?: string;
}) {
  return (
    <Grid size={{ xs: 12 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.65 }}>
        {presets.map((preset) => {
          const active = value === preset.value;
          return (
            <Box
              key={preset.value}
              component="button"
              type="button"
              onClick={() => onChange(toggleValue(value, preset.value))}
              sx={{
                px: 1.15,
                py: 0.55,
                borderRadius: 999,
                border: '1px solid',
                borderColor: active ? 'primary.main' : 'divider',
                bgcolor: active ? 'primary.main' : 'transparent',
                color: active ? 'primary.contrastText' : 'text.secondary',
                fontWeight: 700,
                fontSize: '0.72rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  color: active ? 'primary.contrastText' : 'primary.main',
                },
              }}
            >
              {prefix}
              {preset.label}
              {suffix}
            </Box>
          );
        })}
      </Box>
    </Grid>
  );
}

const BEDROOM_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5+' },
] as const;

/** Equal-width bedroom chips — icon + count, no cramped diagrams. */
export function FilterBedroomPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useCopy();
  return (
    <Grid size={{ xs: 12 }}>
      <Box
        role="radiogroup"
        aria-label={t.browse.bedroomsMinAria}
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: 0.75,
        }}
      >
        {BEDROOM_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <Box
              key={opt.value}
              component="button"
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(toggleValue(value, opt.value))}
              sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                minHeight: 44,
                px: 0.5,
                borderRadius: 999,
                border: '1px solid',
                borderColor: active ? 'primary.main' : 'divider',
                bgcolor: active ? 'primary.main' : 'transparent',
                color: active ? 'primary.contrastText' : 'text.primary',
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: 'none',
                transition: 'background-color 0.15s, border-color 0.15s, color 0.15s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: active ? 'primary.main' : primaryMainAlpha(0.1),
                },
              }}
            >
              <BedIcon size={16} weight={active ? 'fill' : 'duotone'} />
              <Typography
                component="span"
                sx={{
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  lineHeight: 1,
                  color: 'inherit',
                }}
              >
                {opt.label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Grid>
  );
}

export const REAL_ESTATE_TX_VISUAL = [
  { value: 'rent', label: 'Qera', Icon: KeyIcon, hint: 'Qira mujore' },
  { value: 'sale', label: 'Shitje', Icon: HouseLineIcon, hint: 'Blerje' },
] as const;

export const CAR_TRANSMISSION_VISUAL = [
  { value: 'automatic', label: 'Automatik', Icon: GearSixIcon },
  { value: 'manual', label: 'Manual', Icon: SteeringWheelIcon },
] as const;

export const JOB_WORK_LOCATION_VISUAL = [
  { value: 'onsite', label: 'Në zyrë', Icon: BuildingsIcon, hint: 'Onsite' },
  { value: 'hybrid', label: 'Hibrid', Icon: HouseIcon, hint: 'Zyrë + remote' },
  { value: 'remote', label: 'Remote', Icon: MapPinIcon, hint: 'Nga shtëpia' },
] as const;

export const REAL_ESTATE_PRICE_PRESETS = [
  { value: '500', label: '≤ 500' },
  { value: '1000', label: '≤ 1k' },
  { value: '1500', label: '≤ 1.5k' },
  { value: '2500', label: '≤ 2.5k' },
  { value: '5000', label: '≤ 5k' },
] as const;

export const REAL_ESTATE_SURFACE_PRESETS = [
  { value: '50', label: '50+' },
  { value: '80', label: '80+' },
  { value: '100', label: '100+' },
  { value: '150', label: '150+' },
  { value: '200', label: '200+' },
] as const;

export const CAR_PRICE_PRESETS = [
  { value: '3000', label: '≤ 3k' },
  { value: '6000', label: '≤ 6k' },
  { value: '10000', label: '≤ 10k' },
  { value: '15000', label: '≤ 15k' },
  { value: '25000', label: '≤ 25k' },
] as const;

export const CAR_KM_PRESETS = [
  { value: '50000', label: '≤ 50k' },
  { value: '100000', label: '≤ 100k' },
  { value: '150000', label: '≤ 150k' },
  { value: '200000', label: '≤ 200k' },
] as const;

export const CAR_YEAR_MIN_PRESETS = [
  { value: '2015', label: '2015+' },
  { value: '2018', label: '2018+' },
  { value: '2020', label: '2020+' },
  { value: '2022', label: '2022+' },
] as const;

export const VERIFIED_FILTER_VISUAL = [
  { value: '1', label: 'Të verifikuara', Icon: ShieldCheckIcon, hint: 'Vetëm llogari të verifikuara' },
] as const;

export const ANNOUNCEMENT_FILTER_VISUAL = [
  { value: '1', label: 'Me njoftim aktiv', Icon: MegaphoneIcon, hint: 'Kanë publikuar një njoftim' },
] as const;

export const RESERVATIONS_FILTER_VISUAL = [
  { value: '1', label: 'Me rezervim', Icon: CalendarCheckIcon, hint: 'Pranojnë rezervim online' },
] as const;

export const FAST_RESPONSE_FILTER_VISUAL = [
  { value: '1', label: 'Përgjigje e shpejtë', Icon: ClockIcon, hint: 'Brenda 24 orëve' },
] as const;

export const DIRECTORY_SORT_VISUAL: readonly Option[] = [
  { value: 'newest', label: 'Më të rejat' },
  { value: 'rating-desc', label: 'Më të vlerësuarat', Icon: StarIcon },
  { value: 'rating-asc', label: 'Më pak të vlerësuara' },
];

export const MARKETPLACE_PRICE_PRESETS = [
  { value: '50', label: '≤ 50' },
  { value: '100', label: '≤ 100' },
  { value: '250', label: '≤ 250' },
  { value: '500', label: '≤ 500' },
  { value: '1000', label: '≤ 1k' },
] as const;
