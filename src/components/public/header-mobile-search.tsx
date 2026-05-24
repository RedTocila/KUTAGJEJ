'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Box, IconButton, InputAdornment, TextField } from '@mui/material';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';

import { paths } from '@/paths';

export function HeaderMobileSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const hasQuery = query.trim().length > 0;

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    const params = new URLSearchParams();
    params.set('q', trimmed);
    router.push(`${paths.public.realEstate}?${params.toString()}`);
  };

  return (
    <Box
      component="form"
      onSubmit={submit}
      sx={{ flex: 1, minWidth: 0, display: { xs: 'block', md: 'none' } }}
    >
      <TextField
        fullWidth
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Kërko prona, makina, punë…"
        aria-label="Kërko prona, makina, punë"
        slotProps={{
          input: {
            endAdornment: hasQuery ? (
              <InputAdornment position="end" sx={{ mr: -0.5 }}>
                <IconButton
                  type="submit"
                  aria-label="Kërko"
                  size="small"
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: 'primary.main',
                    color: 'grey.900',
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                >
                  <MagnifyingGlassIcon size={15} weight="bold" />
                </IconButton>
              </InputAdornment>
            ) : null,
          },
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            height: 36,
            borderRadius: 999,
            bgcolor: 'action.hover',
            fontSize: '0.8125rem',
            fontWeight: 500,
            pl: 1.25,
            pr: hasQuery ? 0.5 : 1.25,
            '& fieldset': { border: 'none' },
            '& .MuiInputBase-input': {
              py: 0,
              px: 0,
            },
          },
        }}
      />
    </Box>
  );
}
