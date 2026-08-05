'use client';

import * as React from 'react';
import { Box, IconButton, TextField } from '@mui/material';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import {
  PRODUCT_BROWSE_CONTROL_HEIGHT,
  ProductSearchIcon,
  productSearchBarSx,
  productSearchFieldSx,
  type ProductSearchAccent,
} from '@/components/public/product-browse-chrome';

/** @deprecated Import `PRODUCT_BROWSE_CONTROL_HEIGHT` from product-browse-chrome. */
export const BROWSE_CONTROL_HEIGHT = PRODUCT_BROWSE_CONTROL_HEIGHT;

const DEBOUNCE_MS = 320;

export function ListingKeywordSearchInput({
  value,
  placeholder,
  onChange,
  accent,
}: {
  value: string;
  placeholder: string;
  onChange: (next: string) => void;
  /** Optional accent (e.g. OKAZION red) for icon + active/focus chrome. */
  accent?: ProductSearchAccent;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState(value);
  const [focused, setFocused] = React.useState(false);

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

  const hasQuery = Boolean(query.trim());
  const highlighted = hasQuery || focused;
  const iconColor = accent?.color ?? 'var(--mui-palette-primary-main)';

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
        ...productSearchBarSx(highlighted, accent),
      }}
    >
      <ProductSearchIcon color={iconColor} />
      <TextField
        inputRef={inputRef}
        variant="standard"
        size="small"
        fullWidth
        value={query}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        slotProps={{
          input: {
            disableUnderline: true,
            sx: productSearchFieldSx,
          },
        }}
        sx={{ flex: 1, minWidth: 0 }}
      />
      {hasQuery ? (
        <IconButton
          size="small"
          aria-label="Pastro kërkimin"
          onClick={clear}
          sx={{
            p: 0.25,
            color: accent?.color ?? 'text.secondary',
            flexShrink: 0,
          }}
        >
          <XIcon size={12} weight="bold" />
        </IconButton>
      ) : null}
    </Box>
  );
}
