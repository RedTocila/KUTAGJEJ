'use client';

import * as React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import { Moon as MoonIcon } from '@phosphor-icons/react/dist/ssr/Moon';
import { Sun as SunIcon } from '@phosphor-icons/react/dist/ssr/Sun';

import { useCopy } from '@/hooks/use-copy';

function resolveColorScheme(colorScheme: ReturnType<typeof useColorScheme>['colorScheme']): 'light' | 'dark' {
  if (colorScheme === 'dark' || colorScheme === 'light') return colorScheme;
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) return 'dark';
  return 'light';
}

export function ThemeModeToggle() {
  const t = useCopy();
  const { setMode, colorScheme } = useColorScheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const resolved = resolveColorScheme(colorScheme);

  if (!mounted) {
    return (
      <IconButton size="large" disabled sx={{ color: 'text.secondary' }}>
        <Box sx={{ width: 22, height: 22 }} />
      </IconButton>
    );
  }

  return (
    <Tooltip title={resolved === 'dark' ? t.chrome.themeToLight : t.chrome.themeToDark}>
      <IconButton
        size="large"
        onClick={() => {
          setMode(resolved === 'dark' ? 'light' : 'dark');
        }}
        sx={{ color: 'text.secondary' }}
      >
        {resolved === 'dark'
          ? React.createElement(SunIcon, { size: 22 })
          : React.createElement(MoonIcon, { size: 22 })}
      </IconButton>
    </Tooltip>
  );
}
