'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';

import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import {
  AI_SEARCH_BLUE,
  AI_SEARCH_BLUE_HOVER,
  AI_SEARCH_BLUE_ON,
  OKAZION_RED,
  OKAZION_RED_DARK,
  isHomeVerticalId,
  localizeSearchCategories,
  type SearchCategoryId,
} from '@/lib/home-categories';
import { recordSearchInterest } from '@/lib/user-interest-history';
import { paths } from '@/paths';

import { HeroCategoryCircles } from './hero-category-circles';
export interface HeroSearchProps {
  defaultVertical?: SearchCategoryId;
  /** Called after the user submits and navigation runs (e.g. close mobile search sheet). */
  onNavigate?: () => void;
}

export function HeroSearch({ defaultVertical, onNavigate }: HeroSearchProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const t = useCopy();
  const heroVerticals = React.useMemo(() => localizeSearchCategories(language), [language]);
  const initialIdx = defaultVertical
    ? Math.max(0, heroVerticals.findIndex((v) => v.id === defaultVertical))
    : -1;
  const [tab, setTab] = React.useState(initialIdx);
  const [query, setQuery] = React.useState('');

  const active = tab >= 0 ? (heroVerticals[tab] ?? null) : null;
  const isAi = active?.id === 'ai';
  const isOkazion = active?.id === 'okazion';

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = query.trim();
    if (!active) {
      const params = new URLSearchParams();
      if (trimmed) params.set('q', trimmed);
      const qs = params.toString();
      router.push(`${paths.public.search}${qs ? `?${qs}` : ''}`);
      onNavigate?.();
      return;
    }
    if (active.id === 'ai') {
      const params = new URLSearchParams({ cat: 'ai' });
      if (trimmed) params.set('q', trimmed);
      router.push(`${paths.public.search}?${params.toString()}`);
      onNavigate?.();
      return;
    }
    if (active.id === 'okazion') {
      const params = new URLSearchParams();
      if (trimmed) params.set('q', trimmed);
      const qs = params.toString();
      router.push(`${paths.public.okazion}${qs ? `?${qs}` : ''}`);
      onNavigate?.();
      return;
    }
    if (isHomeVerticalId(active.id)) {
      recordSearchInterest({ verticalId: active.id, q: trimmed || undefined });
    }
    const params = new URLSearchParams();
    if (trimmed) params.set('q', trimmed);
    const qs = params.toString();
    const base = active.href.split('?')[0];
    router.push(`${base}${qs ? `?${qs}` : ''}`);
    onNavigate?.();
  };

  return (
    <Stack spacing={1.5} sx={{ width: '100%', maxWidth: 920, mx: 'auto' }}>
      <HeroCategoryCircles variant="tabs" selectedIndex={tab} onSelect={(i) => setTab(i)} />

      <Box
        component="form"
        onSubmit={submit}
        sx={{
          width: '100%',
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
            placeholder={active?.searchPlaceholder ?? t.search.pickCategory}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment
                    position="start"
                    sx={{ color: isAi ? AI_SEARCH_BLUE : 'text.secondary', ml: 0.5 }}
                  >
                    {isAi
                      ? React.createElement(SparkleIcon, { size: 22 })
                      : React.createElement(MagnifyingGlassIcon, { size: 22 })}
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
                  bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.12 : 0.06),
                },
              },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            startIcon={
              isAi
                ? React.createElement(SparkleIcon, { size: 20, weight: 'bold' })
                : React.createElement(MagnifyingGlassIcon, { size: 20, weight: 'bold' })
            }
            sx={{
              borderRadius: 2,
              px: { xs: 3, sm: 4 },
              py: 1.5,
              fontWeight: 700,
              fontSize: '1rem',
              color: isAi ? AI_SEARCH_BLUE_ON : isOkazion ? '#fff' : 'primary.contrastText',
              bgcolor: isAi ? AI_SEARCH_BLUE : isOkazion ? OKAZION_RED : undefined,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: 'none',
                color: isAi ? AI_SEARCH_BLUE_ON : isOkazion ? '#fff' : 'primary.contrastText',
                bgcolor: isAi ? AI_SEARCH_BLUE_HOVER : isOkazion ? OKAZION_RED_DARK : undefined,
              },
              '& .MuiButton-startIcon': { color: 'inherit' },
            }}
          >
            {isAi && active ? active.label : t.home.heroSearch}
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
}
