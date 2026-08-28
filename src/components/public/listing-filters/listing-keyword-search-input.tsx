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
import { useCopy } from '@/hooks/use-copy';

/** @deprecated Import `PRODUCT_BROWSE_CONTROL_HEIGHT` from product-browse-chrome. */
export const BROWSE_CONTROL_HEIGHT = PRODUCT_BROWSE_CONTROL_HEIGHT;

const DEBOUNCE_MS = 320;

export function ListingKeywordSearchInput({
  value,
  placeholder,
  onChange,
  accent,
  commitToChip = false,
  live = false,
}: {
  value: string;
  placeholder: string;
  onChange: (next: string) => void;
  /** Optional accent (e.g. OKAZION red) for icon + active/focus chrome. */
  accent?: ProductSearchAccent;
  /** Applied keyword is shown as a chip when this field is not live. */
  commitToChip?: boolean;
  /** Apply the current query while typing instead of waiting for Enter. */
  live?: boolean;
}) {
  const t = useCopy();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const typingRef = React.useRef(false);
  const [query, setQuery] = React.useState(commitToChip && !live ? '' : value);
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    if (commitToChip && !live) return;
    if (live && typingRef.current) return;
    setQuery(value);
  }, [value, commitToChip, live]);

  React.useEffect(() => {
    if (commitToChip && !live) return;
    const trimmed = query.trim();
    const applied = value.trim();
    if (trimmed === applied) return;

    const handle = window.setTimeout(() => {
      onChange(trimmed);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [query, value, onChange, commitToChip, live]);

  const commitDraft = (next: string) => {
    const trimmed = next.trim();
    if (commitToChip) {
      if (!trimmed) {
        setQuery('');
        return;
      }
      onChange(trimmed);
      if (!live) setQuery('');
      return;
    }
    onChange(trimmed);
  };

  const clear = () => {
    setQuery('');
    if (!commitToChip || live) onChange('');
    inputRef.current?.focus();
  };

  const hasQuery = Boolean(query.trim());
  const highlighted = hasQuery || focused || (commitToChip && Boolean(value.trim()));
  const iconColor = accent?.color ?? 'var(--mui-palette-primary-main)';

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        commitDraft(query);
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
        onChange={(e) => {
          typingRef.current = true;
          setQuery(e.target.value);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          typingRef.current = false;
          if (commitToChip && !live && query.trim()) commitDraft(query);
        }}
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
          aria-label={t.browse.clearSearchAria}
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
