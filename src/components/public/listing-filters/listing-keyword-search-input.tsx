'use client';

import * as React from 'react';
import { Box, IconButton, TextField } from '@mui/material';
import { MagnifyingGlass as SearchIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { primaryMainAlpha } from '@/lib/css-var-alpha';

/** Matches subcategory pill height (22px icon + py 0.75 + 1px borders). */
export const BROWSE_CONTROL_HEIGHT = 36;

const DEBOUNCE_MS = 320;

export function ListingKeywordSearchInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (next: string) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState(value);

  React.useEffect(() => {
    setQuery(value);
  }, [value]);

  React.useEffect(() => {
    const trimmed = query.trim();
    const applied = value.trim();
    if (trimmed === applied) return;

    const handle = window.setTimeout(() => {
      onChange(trimmed);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [query, value, onChange]);

  const clear = () => {
    setQuery('');
    onChange('');
    inputRef.current?.focus();
  };

  const active = Boolean(query.trim());

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        onChange(query.trim());
      }}
      sx={{
        flex: 1,
        minWidth: 0,
        width: '100%',
        height: BROWSE_CONTROL_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1.25,
        py: 0.75,
        borderRadius: 999,
        border: '1px solid',
        borderColor: active ? 'primary.main' : 'divider',
        bgcolor: active ? primaryMainAlpha(0.08) : 'background.paper',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <SearchIcon size={14} color="var(--mui-palette-primary-main)" style={{ flexShrink: 0 }} />
      <TextField
        inputRef={inputRef}
        variant="standard"
        size="small"
        fullWidth
        value={query}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setQuery(e.target.value)}
        slotProps={{
          input: {
            disableUnderline: true,
            sx: {
              fontSize: '0.825rem',
              fontWeight: 600,
              py: 0,
              '& input': { padding: 0 },
              '& input::placeholder': {
                opacity: 0.72,
                fontWeight: 500,
              },
            },
          },
        }}
        sx={{ flex: 1, minWidth: 0 }}
      />
      {active ? (
        <IconButton
          size="small"
          aria-label="Pastro kërkimin"
          onClick={clear}
          sx={{ p: 0.25, color: 'text.secondary', flexShrink: 0 }}
        >
          <XIcon size={12} weight="bold" />
        </IconButton>
      ) : null}
    </Box>
  );
}
