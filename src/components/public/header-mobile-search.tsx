'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Box, IconButton, InputAdornment, TextField } from '@mui/material';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';

import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { buildSmartSearchUrl, parseSmartSearchQuery } from '@/lib/smart-search';

let citiesCache: RealEstateCityDto[] | null = null;
let citiesPromise: Promise<RealEstateCityDto[]> | null = null;

function loadCitiesForSearch(): Promise<RealEstateCityDto[]> {
  if (citiesCache) return Promise.resolve(citiesCache);
  if (!citiesPromise) {
    citiesPromise = listRealEstateLocationsPublic().then((res) => {
      citiesCache = res.cities ?? [];
      return citiesCache;
    });
  }
  return citiesPromise;
}

export function HeaderMobileSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const hasQuery = query.trim().length > 0;

  React.useEffect(() => {
    void loadCitiesForSearch();
  }, []);

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const cities = await loadCitiesForSearch();
      const result = parseSmartSearchQuery(trimmed, cities);
      router.push(buildSmartSearchUrl(result));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={(event) => void submit(event)}
      sx={{ flex: 1, minWidth: 0, display: { xs: 'block', md: 'none' } }}
    >
      <TextField
        fullWidth
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Kërko prona, makina, punë…"
        aria-label="Kërko prona, makina, punë"
        disabled={submitting}
        slotProps={{
          input: {
            endAdornment: hasQuery ? (
              <InputAdornment position="end" sx={{ mr: -0.5 }}>
                <IconButton
                  type="submit"
                  aria-label="Kërko"
                  size="small"
                  disabled={submitting}
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
            fontSize: { xs: '1rem', md: '0.8125rem' },
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
