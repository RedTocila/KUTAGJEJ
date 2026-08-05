'use client';

import * as React from 'react';
import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';

import { useLanguage } from '@/hooks/use-language';
import type { AppLanguage } from '@/lib/language';

/** Compact AL / EN control for the dashboard header (left of theme toggle). */
export function HeaderLanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <Tooltip title={language === 'sq' ? 'Shqip / English' : 'Albanian / English'}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={language}
        onChange={(_event, value: AppLanguage | null) => {
          if (value) setLanguage(value);
        }}
        aria-label="Language"
        sx={{
          flexShrink: 0,
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          borderRadius: 999,
          p: 0.25,
          '& .MuiToggleButtonGroup-grouped': {
            border: 0,
            mx: 0,
            minWidth: 36,
            px: 1,
            py: 0.45,
            fontWeight: 800,
            fontSize: '0.72rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'text.secondary',
            borderRadius: '999px !important',
            '&.Mui-selected': {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.main' },
            },
          },
        }}
      >
        <ToggleButton value="sq" aria-label="Albanian">
          AL
        </ToggleButton>
        <ToggleButton value="en" aria-label="English">
          EN
        </ToggleButton>
      </ToggleButtonGroup>
    </Tooltip>
  );
}
