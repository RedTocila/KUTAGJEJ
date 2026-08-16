'use client';

import * as React from 'react';
import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';

import { portalToggleGroupSx } from '@/components/user/portal-cards';
import { useLanguage } from '@/hooks/use-language';
import type { AppLanguage } from '@/lib/language';

/** Compact AL / EN pill for the dashboard header (left of theme toggle). */
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
        sx={[
          portalToggleGroupSx,
          {
            '& .MuiToggleButtonGroup-grouped': {
              minWidth: 36,
              minHeight: 30,
              px: 1.1,
              py: 0.45,
              fontSize: '0.72rem',
            },
          },
        ]}
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
