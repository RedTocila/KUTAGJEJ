'use client';

import * as React from 'react';
import { Box, FormControl, FormHelperText, InputLabel } from '@mui/material';
import { Check as CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';

import {
  SHARE_THEME_COLORS,
  normalizeShareThemeColor,
  shareThemeContrastText,
} from '@/lib/share-theme-color';

export function ShareThemeColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const selected = normalizeShareThemeColor(value);

  return (
    <FormControl fullWidth variant="outlined">
      <InputLabel
        shrink
        htmlFor="share-theme-color-picker"
        sx={{ bgcolor: 'background.paper', px: 0.5, ml: 0.5 }}
      >
        Ngjyra e temës
      </InputLabel>
      <Box
        id="share-theme-color-picker"
        role="radiogroup"
        aria-label="Ngjyra e temës"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1.15,
          minHeight: 56,
          px: 1.5,
          py: 1.35,
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {SHARE_THEME_COLORS.map((color) => {
          const isSelected = selected === color;
          return (
            <Box
              key={color}
              component="button"
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={color}
              onClick={() => onChange(color)}
              sx={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                bgcolor: color,
                p: 0,
                m: 0,
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                color: shareThemeContrastText(color),
                border: '2px solid',
                borderColor: isSelected ? 'text.primary' : 'transparent',
                boxShadow: isSelected
                  ? `0 0 0 2px ${color}`
                  : 'inset 0 0 0 1px rgba(0,0,0,0.18)',
                transition: 'transform 120ms ease, box-shadow 120ms ease',
                '&:hover': { transform: 'scale(1.08)' },
              }}
            >
              {isSelected ? <CheckIcon size={14} weight="bold" /> : null}
            </Box>
          );
        })}
      </Box>
      <FormHelperText>
        Ngjyra juaj kur ndani ose ruani foton e çdo njoftimi. E shihni vetëm ju.
      </FormHelperText>
    </FormControl>
  );
}
