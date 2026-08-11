'use client';

import * as React from 'react';
import {
  Box,
  ClickAwayListener,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  OutlinedInput,
  Paper,
  Popper,
  TextField,
  Typography,
  type FormControlProps,
} from '@mui/material';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { MagnifyingGlass as SearchIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { productFieldSx, productSurfacePaperSx } from '@/styles/product-sx';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  emptyLabel = 'Të gjitha',
  emptyValue = '',
  size = 'medium',
  fullWidth = true,
  required = false,
  disabled = false,
  clearable = false,
  id,
  searchPlaceholder = 'Kërko…',
  minOptionsForSearch = 5,
  helperText,
  error = false,
  sx,
  menuMinWidth,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SearchableSelectOption[];
  emptyLabel?: string;
  emptyValue?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  required?: boolean;
  disabled?: boolean;
  /** Show the clear (×) control when a value is selected. */
  clearable?: boolean;
  id?: string;
  searchPlaceholder?: string;
  minOptionsForSearch?: number;
  helperText?: string;
  error?: boolean;
  sx?: FormControlProps['sx'];
  /** Minimum width for the dropdown panel (useful for compact fields). */
  menuMinWidth?: number;
}) {
  const fieldId = id ?? `searchable-select-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';
  const showSearch = options.length >= minOptionsForSearch;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const handleToggle = () => {
    if (disabled) return;
    if (open) {
      close();
      return;
    }
    setQuery('');
    setOpen(true);
    window.setTimeout(() => searchRef.current?.focus(), 0);
  };

  const handleSelect = (next: string) => {
    onChange(next);
    close();
  };

  return (
    <ClickAwayListener onClickAway={close}>
      <FormControl fullWidth={fullWidth} size={size} required={required} disabled={disabled} error={error} sx={sx}>
        <InputLabel id={`${fieldId}-label`} shrink sx={{ fontWeight: 600 }}>
          {label}
        </InputLabel>
        <OutlinedInput
          id={fieldId}
          ref={anchorRef}
          label={label}
          readOnly
          notched
          error={error}
          value={selectedLabel}
          placeholder={emptyLabel}
          onClick={handleToggle}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              if (open) {
                e.preventDefault();
                close();
              }
              return;
            }
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToggle();
              return;
            }
            if (e.key === 'ArrowDown' && !open) {
              e.preventDefault();
              handleToggle();
            }
          }}
          endAdornment={
            <InputAdornment position="end" sx={{ gap: 0.25, ml: 0 }}>
              {clearable && value ? (
                <IconButton
                  size="small"
                  aria-label="Pastro zgjedhjen"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(emptyValue);
                  }}
                  sx={{ p: 0.25 }}
                >
                  <XIcon size={12} />
                </IconButton>
              ) : null}
              <CaretDownIcon size={14} />
            </InputAdornment>
          }
          sx={{
            borderRadius: 2.5,
            cursor: disabled ? 'not-allowed' : 'pointer',
            bgcolor: 'background.paper',
            transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
            '& input': {
              cursor: disabled ? 'not-allowed' : 'pointer',
              textOverflow: 'ellipsis',
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px ${primaryMainAlpha(0.12)}`,
            },
          }}
        />

        <Popper
          open={open}
          anchorEl={anchorRef.current}
          placement="bottom-start"
          data-scroll-lock-allow=""
          sx={{
            zIndex: 1600,
            width: Math.max(anchorRef.current?.offsetWidth ?? 240, menuMinWidth ?? 0),
          }}
          modifiers={[{ name: 'preventOverflow', options: { padding: 8 } }]}
        >
          <Paper
            elevation={0}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            sx={(theme) => ({
              ...productSurfacePaperSx(theme),
              mt: 0.5,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: { xs: 'min(70dvh, 480px)', sm: 'min(60vh, 420px)' },
              minHeight: 0,
              overflow: 'hidden',
              borderRadius: 2.5,
            })}
          >
            {showSearch ? (
              <Box
                sx={{
                  p: 1.25,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'inherit',
                  flexShrink: 0,
                }}
              >
                <TextField
                  inputRef={searchRef}
                  size="small"
                  fullWidth
                  placeholder={searchPlaceholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start" sx={{ mr: -0.25 }}>
                          <SearchIcon size={14} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    ...productFieldSx,
                    '& .MuiOutlinedInput-root': {
                      ...productFieldSx['& .MuiOutlinedInput-root'],
                      fontSize: '0.875rem',
                    },
                  }}
                />
              </Box>
            ) : null}

            <List
              dense
              disablePadding
              role="listbox"
              sx={{
                flex: '1 1 auto',
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                touchAction: 'pan-y',
                py: 0.5,
              }}
            >
              <ListItemButton
                selected={value === emptyValue}
                disableTouchRipple
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(emptyValue)}
                sx={{ py: 0.6, px: 1.5, touchAction: 'pan-y' }}
              >
                <ListItemText
                  primary={emptyLabel}
                  slotProps={{ primary: { sx: { fontSize: '0.875rem', fontStyle: 'italic' } } }}
                />
              </ListItemButton>
              {filtered.map((option) => (
                <ListItemButton
                  key={option.value}
                  selected={value === option.value}
                  disableTouchRipple
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(option.value)}
                  sx={{ py: 0.6, px: 1.5, touchAction: 'pan-y' }}
                >
                  <ListItemText
                    primary={option.label}
                    slotProps={{
                      primary: { sx: { fontSize: '0.875rem', fontWeight: value === option.value ? 600 : 500 } },
                    }}
                  />
                </ListItemButton>
              ))}
              {filtered.length === 0 ? (
                <Typography sx={{ px: 1.5, py: 1.25, fontSize: '0.84rem', color: 'text.secondary' }}>
                  Nuk u gjet asnjë rezultat
                </Typography>
              ) : null}
            </List>
          </Paper>
        </Popper>

        {helperText ? <FormHelperText error={error}>{helperText}</FormHelperText> : null}
      </FormControl>
    </ClickAwayListener>
  );
}
