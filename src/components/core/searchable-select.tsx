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
import { PencilSimple as PencilIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { useCopy } from '@/hooks/use-copy';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { productFieldSx, productSurfacePaperSx } from '@/styles/product-sx';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

function isOtherOption(option: SearchableSelectOption): boolean {
  const v = option.value.trim().toLowerCase();
  const l = option.label.trim().toLowerCase();
  return v === 'other' || l === 'other' || l === 'tjetër';
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
  searchPlaceholder,
  minOptionsForSearch = 5,
  helperText,
  error = false,
  sx,
  menuMinWidth,
  allowCustom = false,
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
  /**
   * Adds “Other…” so the user can type a value that is not in the list.
   * Stored value is the custom text (never a sentinel).
   */
  allowCustom?: boolean;
}) {
  const t = useCopy();
  const fieldId = id ?? `searchable-select-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const customRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [customEditing, setCustomEditing] = React.useState(false);

  const catalogOptions = React.useMemo(() => {
    if (!allowCustom) return options;
    return options.filter((o) => !isOtherOption(o));
  }, [allowCustom, options]);

  const isKnownValue = catalogOptions.some((o) => o.value === value);
  const isCustomValue = allowCustom && Boolean(value) && value !== emptyValue && !isKnownValue;

  React.useEffect(() => {
    if (!allowCustom) {
      setCustomEditing(false);
      return;
    }
    if (!value || value === emptyValue) return;
    setCustomEditing(!isKnownValue);
  }, [allowCustom, emptyValue, isKnownValue, value]);

  const selectedLabel = isKnownValue
    ? (catalogOptions.find((o) => o.value === value)?.label ?? '')
    : allowCustom
      ? value
      : '';
  const showSearch = allowCustom || catalogOptions.length >= minOptionsForSearch;
  const searchPh = searchPlaceholder ?? t.common.search;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalogOptions;
    return catalogOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [catalogOptions, query]);

  const typedQuery = query.trim();
  const showUseQuery =
    allowCustom &&
    typedQuery.length > 0 &&
    !catalogOptions.some((o) => o.label.toLowerCase() === typedQuery.toLowerCase());

  const close = React.useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const handleScroll = () => close();
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [close, open]);

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
    setCustomEditing(false);
    onChange(next);
    close();
  };

  const handlePickCustom = (next = '') => {
    setCustomEditing(true);
    onChange(next);
    close();
    window.setTimeout(() => customRef.current?.focus(), 0);
  };

  const displayValue = customEditing || isCustomValue ? value : selectedLabel;

  return (
    <ClickAwayListener onClickAway={close}>
      <FormControl
        fullWidth={fullWidth}
        size={size}
        required={required}
        disabled={disabled}
        error={error}
        sx={[{ position: 'relative' }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
      >
        <InputLabel id={`${fieldId}-label`} shrink sx={{ fontWeight: 600 }}>
          {label}
        </InputLabel>
        <OutlinedInput
          id={fieldId}
          ref={anchorRef}
          label={label}
          readOnly={!customEditing && !isCustomValue}
          notched
          error={error}
          inputRef={customEditing || isCustomValue ? customRef : undefined}
          value={displayValue}
          placeholder={customEditing || isCustomValue ? t.common.typeYourOwn : emptyLabel}
          onClick={() => {
            if (disabled) return;
            if (customEditing || isCustomValue) return;
            handleToggle();
          }}
          onChange={(e) => {
            if (customEditing || isCustomValue) onChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              if (open) {
                e.preventDefault();
                close();
              }
              return;
            }
            if (customEditing || isCustomValue) return;
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
                  aria-label={t.common.close}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCustomEditing(false);
                    handleSelect(emptyValue);
                  }}
                  sx={{ p: 0.25 }}
                >
                  <XIcon size={12} />
                </IconButton>
              ) : null}
              <IconButton
                size="small"
                aria-label={open ? t.common.close : t.common.search}
                disabled={disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle();
                }}
                sx={{ p: 0.25 }}
              >
                <CaretDownIcon size={14} />
              </IconButton>
            </InputAdornment>
          }
          sx={{
            borderRadius: 2.5,
            cursor: disabled ? 'not-allowed' : customEditing || isCustomValue ? 'text' : 'pointer',
            bgcolor: 'background.paper',
            transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
            '& input': {
              cursor: disabled ? 'not-allowed' : customEditing || isCustomValue ? 'text' : 'pointer',
              textOverflow: 'ellipsis',
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px ${primaryMainAlpha(0.12)}`,
            },
          }}
        />

        {open ? (
          <Popper
            open
            disablePortal
            anchorEl={anchorRef.current}
            placement="bottom-start"
            data-scroll-lock-allow=""
            sx={{
              zIndex: 10,
              width: Math.max(anchorRef.current?.offsetWidth ?? 240, menuMinWidth ?? 0),
            }}
            modifiers={[
              { name: 'offset', options: { offset: [0, 4] } },
              { name: 'flip', options: { fallbackPlacements: ['top-start'] } },
              { name: 'preventOverflow', options: { padding: 8 } },
            ]}
          >
            <Paper
            elevation={0}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            sx={(theme) => ({
              ...productSurfacePaperSx(theme),
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
                  placeholder={searchPh}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && showUseQuery) {
                      e.preventDefault();
                      handlePickCustom(typedQuery);
                    }
                  }}
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
                selected={value === emptyValue && !customEditing}
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
                  selected={!customEditing && value === option.value}
                  disableTouchRipple
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(option.value)}
                  sx={{ py: 0.6, px: 1.5, touchAction: 'pan-y' }}
                >
                  <ListItemText
                    primary={option.label}
                    slotProps={{
                      primary: {
                        sx: {
                          fontSize: '0.875rem',
                          fontWeight: !customEditing && value === option.value ? 600 : 500,
                        },
                      },
                    }}
                  />
                </ListItemButton>
              ))}
              {showUseQuery ? (
                <ListItemButton
                  selected={false}
                  disableTouchRipple
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handlePickCustom(typedQuery)}
                  sx={{ py: 0.6, px: 1.5, touchAction: 'pan-y' }}
                >
                  <ListItemText
                    primary={t.common.useCustomValue(typedQuery)}
                    slotProps={{
                      primary: { sx: { fontSize: '0.875rem', fontWeight: 600, color: 'primary.main' } },
                    }}
                  />
                </ListItemButton>
              ) : null}
              {allowCustom ? (
                <ListItemButton
                  selected={customEditing || isCustomValue}
                  disableTouchRipple
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handlePickCustom(isCustomValue ? value : '')}
                  sx={{ py: 0.6, px: 1.5, touchAction: 'pan-y', alignItems: 'center', gap: 1 }}
                >
                  <PencilIcon size={14} />
                  <ListItemText
                    primary={t.common.otherSpecify}
                    slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: 600 } } }}
                  />
                </ListItemButton>
              ) : null}
              {filtered.length === 0 && !showUseQuery && !allowCustom ? (
                <Typography sx={{ px: 1.5, py: 1.25, fontSize: '0.84rem', color: 'text.secondary' }}>
                  {t.common.noResults}
                </Typography>
              ) : null}
            </List>
          </Paper>
          </Popper>
        ) : null}

        {helperText ? <FormHelperText error={error}>{helperText}</FormHelperText> : null}
      </FormControl>
    </ClickAwayListener>
  );
}
