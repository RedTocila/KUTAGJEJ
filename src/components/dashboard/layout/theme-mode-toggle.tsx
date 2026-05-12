'use client';

import * as React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { useColorScheme, useTheme } from '@mui/material/styles';
import { Moon as MoonIcon } from '@phosphor-icons/react/dist/ssr/Moon';
import { Sun as SunIcon } from '@phosphor-icons/react/dist/ssr/Sun';

export function ThemeModeToggle() {
  const { setMode } = useColorScheme();
  const theme = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const resolved: 'light' | 'dark' = theme.palette.mode;

  if (!mounted) {
    return (
      <IconButton size="large" disabled sx={{ color: 'text.secondary' }}>
        <Box sx={{ width: 22, height: 22 }} />
      </IconButton>
    );
  }

  return (
    <Tooltip title={resolved === 'dark' ? 'Kalo në modalitet të çelët' : 'Kalo në modalitet të errët'}>
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
