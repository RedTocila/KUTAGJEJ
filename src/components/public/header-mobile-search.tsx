'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import { Box, InputAdornment, TextField } from '@mui/material';

import { paths } from '@/paths';

export function HeaderMobileSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState('');

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    const qs = params.toString();
    router.push(`${paths.public.realEstate}${qs ? `?${qs}` : ''}`);
  };

  return (
    <Box
      component="form"
      onSubmit={submit}
      sx={{ flex: 1, minWidth: 0, display: { xs: 'block', md: 'none' } }}
    >
      <TextField
        fullWidth
        size="small"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Kërko prona, makina, punë…"
        aria-label="Kërko prona, makina, punë"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start" sx={{ color: 'text.secondary', ml: 0.25 }}>
                <SearchOutlined sx={{ fontSize: 20 }} />
              </InputAdornment>
            ),
            sx: {
              py: 0.85,
              fontSize: '0.875rem',
              fontWeight: 500,
              bgcolor: 'action.hover',
              borderRadius: 2.5,
              '& fieldset': { border: 'none' },
            },
          },
        }}
      />
    </Box>
  );
}
