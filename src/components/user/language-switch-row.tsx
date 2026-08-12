'use client';

import * as React from 'react';
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { Translate as TranslateIcon } from '@phosphor-icons/react/dist/ssr/Translate';

import { PortalIconBox, portalCardSx, portalToggleGroupSx } from '@/components/user/portal-cards';
import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import type { AppLanguage } from '@/lib/language';

export function LanguageSwitchRow({ grouped = false }: { grouped?: boolean }) {
  const { language, setLanguage } = useLanguage();
  const t = useCopy();

  return (
    <Box
      sx={{
        p: { xs: 2.25, sm: 2.75 },
        ...(grouped ? null : portalCardSx),
      }}
    >
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
          sx={portalToggleGroupSx}
        >
          <ToggleButton value="sq" aria-label="Shqip">
            AL
          </ToggleButton>
          <ToggleButton value="en" aria-label="English">
            EN
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
    </Box>
  );
}
