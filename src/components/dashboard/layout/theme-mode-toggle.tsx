'use client';

import * as React from 'react';
import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import { Moon as MoonIcon } from '@phosphor-icons/react/dist/ssr/Moon';
import { Sun as SunIcon } from '@phosphor-icons/react/dist/ssr/Sun';

import { portalToggleGroupSx } from '@/components/user/portal-cards';
import { useCopy } from '@/hooks/use-copy';

function resolveColorScheme(colorScheme: ReturnType<typeof useColorScheme>['colorScheme']): 'light' | 'dark' {
  if (colorScheme === 'dark' || colorScheme === 'light') return colorScheme;
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) return 'dark';
  return 'light';
}

export function ThemeModeToggle({ iconSize = 16 }: { iconSize?: number }) {
  const t = useCopy();
  const { setMode, colorScheme } = useColorScheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const resolved = mounted ? resolveColorScheme(colorScheme) : 'light';
  const glyph = Math.min(18, Math.max(14, iconSize));

  return (
    <Tooltip title={resolved === 'dark' ? t.chrome.themeToLight : t.chrome.themeToDark}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={resolved}
        disabled={!mounted}
        onChange={(_event, value: 'light' | 'dark' | null) => {
          if (value) setMode(value);
        }}
        aria-label={t.theme.title}
        sx={[
          portalToggleGroupSx,
          {
            '& .MuiToggleButtonGroup-grouped': {
              minWidth: 36,
              minHeight: 30,
              px: 1.1,
              py: 0.45,
            },
          },
        ]}
      >
        <ToggleButton value="light" aria-label={t.chrome.themeToLight}>
          <SunIcon size={glyph} weight="bold" />
        </ToggleButton>
        <ToggleButton value="dark" aria-label={t.chrome.themeToDark}>
          <MoonIcon size={glyph} weight="bold" />
        </ToggleButton>
      </ToggleButtonGroup>
    </Tooltip>
  );
}
