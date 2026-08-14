'use client';

import * as React from 'react';
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import { Moon as MoonIcon } from '@phosphor-icons/react/dist/ssr/Moon';
import { Sun as SunIcon } from '@phosphor-icons/react/dist/ssr/Sun';

import { PortalIconBox, portalCardSx, portalToggleGroupSx } from '@/components/user/portal-cards';
import { useCopy } from '@/hooks/use-copy';

function resolveColorScheme(colorScheme: ReturnType<typeof useColorScheme>['colorScheme']): 'light' | 'dark' {
  if (colorScheme === 'dark' || colorScheme === 'light') return colorScheme;
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) return 'dark';
  return 'light';
}

export function ThemeSwitchRow({ grouped = false }: { grouped?: boolean }) {
  const t = useCopy();
  const { setMode, colorScheme } = useColorScheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const resolved = mounted ? resolveColorScheme(colorScheme) : 'light';

  return (
    <Box
      sx={{
        p: { xs: 2.25, sm: 2.75 },
        ...(grouped ? null : portalCardSx),
      }}
    >
      <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center' }}>
        <PortalIconBox>
          {resolved === 'dark'
            ? React.createElement(SunIcon, { size: 24, weight: 'duotone' })
            : React.createElement(MoonIcon, { size: 24, weight: 'duotone' })}
        </PortalIconBox>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
            {t.theme.title}
          </Typography>
        </Box>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={resolved}
          disabled={!mounted}
          onChange={(_event, value: 'light' | 'dark' | null) => {
            if (value) setMode(value);
          }}
          aria-label={t.theme.title}
          sx={portalToggleGroupSx}
        >
          <ToggleButton value="light" aria-label={t.chrome.themeToLight}>
            <SunIcon size={14} weight="bold" />
          </ToggleButton>
          <ToggleButton value="dark" aria-label={t.chrome.themeToDark}>
            <MoonIcon size={14} weight="bold" />
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
    </Box>
  );
}
