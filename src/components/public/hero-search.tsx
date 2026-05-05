'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  alpha,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
} from '@mui/material';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';

import { HOME_VERTICALS, type HomeVerticalId } from '@/lib/home-categories';

import { VerticalIcon } from './vertical-icon';

export interface HeroSearchProps {
  defaultVertical?: HomeVerticalId;
}

export function HeroSearch({ defaultVertical = 'real-estate' }: HeroSearchProps) {
  const router = useRouter();
  const initialIdx = React.useMemo(
    () => Math.max(0, HOME_VERTICALS.findIndex((v) => v.id === defaultVertical)),
    [defaultVertical],
  );
  const [tab, setTab] = React.useState(initialIdx);
  const [query, setQuery] = React.useState('');

  const active = HOME_VERTICALS[tab];

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    const qs = params.toString();
    router.push(`${active.href}${qs ? `?${qs}` : ''}`);
  };

  return (
    <Box
      component="form"
      onSubmit={submit}
      sx={{
        width: '100%',
        maxWidth: 920,
        mx: 'auto',
        borderRadius: 3,
        bgcolor: (theme) =>
          `rgb(var(--mui-palette-background-paperChannel) / ${theme.palette.mode === 'dark' ? 0.85 : 0.96})`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: (theme) =>
          theme.palette.mode === 'dark'
            ? '0 24px 60px -24px rgba(0,0,0,0.7)'
            : '0 24px 60px -24px rgba(58, 140, 0, 0.25)',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: { xs: 1, sm: 2 },
          pt: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v: number) => setTab(v)}
          variant="scrollable"
          scrollButtons={false}
          allowScrollButtonsMobile
          slotProps={{
            indicator: {
              sx: {
                height: 3,
                borderRadius: '3px 3px 0 0',
                bgcolor: 'primary.main',
              },
            },
          }}
          sx={{
            minHeight: 0,
            '& .MuiTab-root': {
              minHeight: 0,
              py: 1.25,
              px: { xs: 1.5, sm: 2.25 },
              textTransform: 'none',
              fontWeight: 600,
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
              color: 'text.secondary',
              gap: 0.75,
            },
            '& .MuiTab-root.Mui-selected': { color: 'primary.main' },
          }}
        >
          {HOME_VERTICALS.map((v) => (
            <Tab
              key={v.id}
              label={
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <VerticalIcon verticalId={v.id} size={20} decorative />
                  <span>{v.label}</span>
                </Stack>
              }
            />
          ))}
        </Tabs>
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1, sm: 1.25 }}
        sx={{ p: { xs: 1.25, sm: 1.5 }, pb: { xs: 1.25, sm: 1.5 }, alignItems: { sm: 'center' } }}
      >
        <TextField
          fullWidth
          size="medium"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={active.searchPlaceholder}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start" sx={{ color: 'text.secondary', ml: 0.5 }}>
                  {React.createElement(MagnifyingGlassIcon, { size: 22 })}
                </InputAdornment>
              ),
              endAdornment: query ? (
                <InputAdornment position="end">
                  <Tooltip title="Pastro">
                    <IconButton size="small" onClick={() => setQuery('')} aria-label="Pastro fushën">
                      <Box component="span" sx={{ fontSize: '1.1rem', lineHeight: 1, color: 'text.secondary' }}>
                        ×
                      </Box>
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ) : null,
              sx: {
                fontSize: { xs: '1rem', sm: '1.05rem' },
                fontWeight: 500,
                bgcolor: 'transparent',
                '& fieldset': { border: 'none' },
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              },
            },
          }}
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': {
              bgcolor: 'action.hover',
              borderRadius: 2,
              '&.Mui-focused': {
                bgcolor: (theme) =>
                  alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06),
              },
            },
          }}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          startIcon={React.createElement(MagnifyingGlassIcon, { size: 20, weight: 'bold' })}
          sx={{
            borderRadius: 2,
            px: { xs: 3, sm: 4 },
            py: 1.5,
            fontWeight: 700,
            fontSize: '1rem',
            textTransform: 'none',
            background: (theme) =>
              `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            boxShadow: (theme) => `0 12px 32px -10px ${alpha(theme.palette.primary.main, 0.6)}`,
            '&:hover': {
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
            },
          }}
        >
          Kërko
        </Button>
      </Stack>
    </Box>
  );
}
