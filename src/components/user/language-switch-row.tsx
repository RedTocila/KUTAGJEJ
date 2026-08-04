'use client';

import * as React from 'react';
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { Translate as TranslateIcon } from '@phosphor-icons/react/dist/ssr/Translate';

import { PortalIconBox, portalCardSx } from '@/components/user/portal-cards';
import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import type { AppLanguage } from '@/lib/language';

export function LanguageSwitchRow() {
  const { language, setLanguage } = useLanguage();
  const t = useCopy();

  return (
    <Box sx={{ ...portalCardSx, p: { xs: 2.25, sm: 2.75 } }}>
      <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center' }}>
        <PortalIconBox>{React.createElement(TranslateIcon, { size: 24, weight: 'duotone' })}</PortalIconBox>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
            {t.language.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35, lineHeight: 1.45 }}>
            {t.language.description}
          </Typography>
        </Box>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={language}
          onChange={(_event, value: AppLanguage | null) => {
            if (value) setLanguage(value);
          }}
          aria-label={t.language.title}
          sx={{
            flexShrink: 0,
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
            borderRadius: 2,
            '& .MuiToggleButtonGroup-grouped': {
              border: 0,
              mx: 0,
              px: 1.35,
              py: 0.65,
              fontWeight: 800,
              fontSize: '0.78rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'text.secondary',
              borderRadius: '8px !important',
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.main' },
              },
            },
          }}
        >
          <ToggleButton value="sq" aria-label="Shqip">
            SQ
          </ToggleButton>
          <ToggleButton value="en" aria-label="English">
            EN
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
    </Box>
  );
}
