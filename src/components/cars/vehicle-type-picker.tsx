'use client';

import * as React from 'react';
import { Box, FormHelperText, Stack, Typography } from '@mui/material';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { Boat as BoatIcon } from '@phosphor-icons/react/dist/ssr/Boat';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { CarProfile as CarProfileIcon } from '@phosphor-icons/react/dist/ssr/CarProfile';
import { Motorcycle as MotorcycleIcon } from '@phosphor-icons/react/dist/ssr/Motorcycle';
import { Truck as TruckIcon } from '@phosphor-icons/react/dist/ssr/Truck';
import { Van as VanIcon } from '@phosphor-icons/react/dist/ssr/Van';

import { VEHICLE_TYPES, type VehicleType } from '@/lib/car-constants';
import { primaryMainAlpha } from '@/lib/css-var-alpha';

export const VEHICLE_TYPE_ICONS: Record<VehicleType, PhosphorIcon> = {
  car: CarIcon,
  suv: CarProfileIcon,
  van: VanIcon,
  truck: TruckIcon,
  motorcycle: MotorcycleIcon,
  boat: BoatIcon,
};

export function VehicleTypePicker({
  value,
  onChange,
  error,
  helperText,
  label = 'Category',
  required = false,
  allowClear = false,
  size = 'default',
}: {
  value: VehicleType | '';
  onChange: (value: VehicleType | '') => void;
  error?: boolean;
  helperText?: string;
  label?: string;
  required?: boolean;
  /** When true, tapping the active tile clears the selection (filters). */
  allowClear?: boolean;
  size?: 'default' | 'compact';
}) {
  const tile = size === 'compact' ? 76 : 84;
  const iconSize = size === 'compact' ? 24 : 28;

  return (
    <Stack spacing={0.75}>
      {label ? (
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: error ? 'error.main' : 'text.secondary',
            fontSize: '0.68rem',
          }}
        >
          {label}
          {required ? ' *' : ''}
        </Typography>
      ) : null}

      <Box
        role="listbox"
        aria-label={label || 'Vehicle category'}
        sx={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          gap: 1,
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'x proximity',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          mx: -0.25,
          px: 0.25,
          py: 0.35,
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {VEHICLE_TYPES.map((opt) => {
          const active = value === opt.value;
          const Icon = VEHICLE_TYPE_ICONS[opt.value];
          return (
            <Box
              key={opt.value}
              component="button"
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => {
                if (allowClear && active) onChange('');
                else onChange(opt.value);
              }}
              sx={{
                flex: '0 0 auto',
                width: tile,
                height: tile,
                scrollSnapAlign: 'start',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.65,
                p: 1,
                borderRadius: 2.25,
                border: '1.5px solid',
                borderColor: active ? 'primary.main' : error ? 'error.main' : 'divider',
                bgcolor: active ? primaryMainAlpha(0.16) : 'background.paper',
                color: active ? 'primary.main' : 'text.primary',
                boxShadow: active ? `0 0 0 3px ${primaryMainAlpha(0.22)}, 0 4px 14px ${primaryMainAlpha(0.2)}` : 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s, background-color 0.15s, color 0.15s, box-shadow 0.15s, transform 0.15s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: primaryMainAlpha(0.1),
                  transform: 'translateY(-1px)',
                },
              }}
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 1.5,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: active ? 'primary.main' : primaryMainAlpha(0.12),
                  color: active ? 'primary.contrastText' : 'primary.main',
                  transition: 'background-color 0.15s, color 0.15s',
                }}
              >
                <Icon size={iconSize - 6} weight={active ? 'fill' : 'duotone'} />
              </Box>
              <Typography
                sx={{
                  fontWeight: active ? 800 : 650,
                  fontSize: '0.7rem',
                  lineHeight: 1.15,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  color: active ? 'primary.main' : 'text.primary',
                }}
              >
                {opt.label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {helperText ? (
        <FormHelperText error={error} sx={{ mx: 0 }}>
          {helperText}
        </FormHelperText>
      ) : null}
    </Stack>
  );
}
