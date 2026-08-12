'use client';

import * as React from 'react';
import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';

import {
  BUSINESS_MOBILE_CTA_OPTIONS,
  type BusinessMobileCtaMode,
} from '@/lib/business-mobile-cta';

export function BusinessMobileCtaPicker({
  value,
  onChange,
  compact = false,
}: {
  value: BusinessMobileCtaMode;
  onChange: (mode: BusinessMobileCtaMode) => void;
  compact?: boolean;
}) {
  return (
    <FormControl component="fieldset" sx={{ width: '100%' }}>
      <FormLabel
        component="legend"
        sx={{
          fontWeight: 800,
          fontSize: compact ? '0.875rem' : '1rem',
          color: 'text.primary',
          mb: 1,
        }}
      >
        Butoni kryesor (mobile)
      </FormLabel>
      <RadioGroup
        value={value}
        onChange={(e) => onChange(e.target.value as BusinessMobileCtaMode)}
      >
        <Stack spacing={compact ? 0.75 : 1}>
          {BUSINESS_MOBILE_CTA_OPTIONS.map((option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={<Radio size="small" />}
              sx={{ alignItems: 'flex-start', mx: 0 }}
              label={
                <Stack spacing={0.25} sx={{ pt: 0.15 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: compact ? '0.875rem' : '0.9375rem', lineHeight: 1.3 }}>
                    {option.label}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: compact ? '0.75rem' : '0.8125rem', lineHeight: 1.35 }}>
                    {option.description}
                  </Typography>
                </Stack>
              }
            />
          ))}
        </Stack>
      </RadioGroup>
    </FormControl>
  );
}

export function reservationsEnabledForMobileCta(mode: BusinessMobileCtaMode, current: boolean): boolean {
  if (mode === 'reserve') return true;
  return current;
}
