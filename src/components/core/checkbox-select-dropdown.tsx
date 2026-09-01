'use client';

import * as React from 'react';
import {
  Box,
  Checkbox,
  Collapse,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Stack,
  TextField,
  Typography,
  type FormControlProps,
} from '@mui/material';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { MagnifyingGlass as SearchIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { useCopy } from '@/hooks/use-copy';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { productFieldSx, productPanelSx } from '@/styles/product-sx';

export interface CheckboxSelectOption {
  value: string;
  label: string;
}

type BaseProps = {
  label: string;
  options: readonly CheckboxSelectOption[];
  emptyLabel?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  disabled?: boolean;
  /** Show clear control when a value is selected. Single mode only. */
  clearable?: boolean;
  id?: string;
  searchable?: boolean;
  minOptionsForSearch?: number;
  searchPlaceholder?: string;
  helperText?: string;
  error?: boolean;
  sx?: FormControlProps['sx'];
  renderOptionLabel?: (option: CheckboxSelectOption, selected: boolean) => React.ReactNode;
  panelFooter?: React.ReactNode;
  /** Override the closed-state summary text. */
  displayValue?: string;
  /** Grid columns inside the panel (default: 1). */
  columns?: 1 | 2 | 3;
};

type SingleProps = BaseProps & {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
};

type MultipleProps = BaseProps & {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
};

export type CheckboxSelectDropdownProps = SingleProps | MultipleProps;

function OptionsScrollArea({
  children,
  resetKey,
}: {
  children: React.ReactNode;
  resetKey: string | number;
}) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = React.useState(false);

  const sync = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollDown(el.scrollHeight - el.clientHeight - el.scrollTop > 12);
  }, []);

  React.useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    el.scrollTop = 0;
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    el.addEventListener('scroll', sync, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', sync);
    };
  }, [sync, resetKey]);

  return (
    <Box sx={{ position: 'relative', flexShrink: 0 }}>
      <Box
        ref={scrollerRef}
        sx={{
          maxHeight: { xs: 'min(50dvh, 360px)', sm: 'min(45vh, 320px)' },
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          py: 0.75,
          px: 0.5,
          scrollbarWidth: 'thin',
        }}
      >
        {children}
      </Box>
      {canScrollDown ? (
        <Box
          aria-hidden
          sx={{
            pointerEvents: 'none',
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 56,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            pb: 0.5,
            background:
              'linear-gradient(to top, rgb(var(--mui-palette-background-paperChannel) / 1) 30%, rgb(var(--mui-palette-background-paperChannel) / 0) 100%)',
          }}
        >
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              color: 'primary.main',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
            }}
          >
            <CaretDownIcon size={13} weight="bold" />
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}

function summaryForMultiple(
  values: string[],
  options: readonly CheckboxSelectOption[],
  emptyLabel: string,
): string {
  if (values.length === 0) return emptyLabel;
  if (values.length === 1) {
    return options.find((o) => o.value === values[0])?.label ?? values[0]!;
  }
  return `${values.length} selected`;
}

export function CheckboxSelectDropdown(props: CheckboxSelectDropdownProps) {
  const {
    label,
    options,
    emptyLabel = 'Select…',
    size = 'medium',
    fullWidth = true,
    disabled = false,
    clearable = false,
    id,
    searchable,
    minOptionsForSearch = 8,
    searchPlaceholder,
    helperText,
    error = false,
    sx,
    renderOptionLabel,
    panelFooter,
    displayValue,
    columns = 1,
  } = props;

  const t = useCopy();
  const multiple = props.multiple === true;
  const fieldId = id ?? `checkbox-select-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const selectedValues = multiple ? props.value : props.value ? [props.value] : [];
  const showSearch = searchable ?? options.length >= minOptionsForSearch;
  const searchPh = searchPlaceholder ?? t.common.search;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const handleToggle = () => {
    if (disabled) return;
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        setQuery('');
        if (showSearch) window.setTimeout(() => searchRef.current?.focus(), 0);
      }
      return next;
    });
  };

  const isSelected = (value: string) => selectedValues.includes(value);

  const toggleOption = (value: string) => {
    if (multiple) {
      const has = props.value.includes(value);
      props.onChange(has ? props.value.filter((v) => v !== value) : [...props.value, value]);
      return;
    }
    props.onChange(props.value === value ? '' : value);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiple) props.onChange([]);
    else props.onChange('');
  };

  const closedLabel =
    displayValue ??
    (multiple
      ? summaryForMultiple(props.value, options, emptyLabel)
      : props.value
        ? (options.find((o) => o.value === props.value)?.label ?? props.value)
        : emptyLabel);

  const hasSelection = multiple ? props.value.length > 0 : Boolean(props.value);

  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      disabled={disabled}
      error={error}
      sx={[...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    >
      <InputLabel id={`${fieldId}-label`} shrink sx={{ fontWeight: 600 }}>
        {label}
      </InputLabel>
      <OutlinedInput
        id={fieldId}
        label={label}
        readOnly
        notched
        error={error}
        value={closedLabel}
        aria-expanded={open}
        onClick={handleToggle}
        onKeyDown={(e) => {
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
            {clearable && hasSelection ? (
              <IconButton
                size="small"
                aria-label={t.common.close}
                onMouseDown={(e) => e.preventDefault()}
                onClick={clear}
                sx={{ p: 0.25 }}
              >
                <XIcon size={12} />
              </IconButton>
            ) : null}
            <IconButton
              size="small"
              aria-label={open ? t.common.close : label}
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
              sx={{
                p: 0.25,
                transition: 'transform 0.15s ease',
                transform: open ? 'rotate(180deg)' : 'none',
              }}
            >
              <CaretDownIcon size={14} />
            </IconButton>
          </InputAdornment>
        }
        sx={{
          borderRadius: open ? '20px 20px 0 0' : 2.5,
          cursor: disabled ? 'not-allowed' : 'pointer',
          bgcolor: 'background.paper',
          transition: 'box-shadow 0.15s ease, border-color 0.15s ease, border-radius 0.15s ease',
          '& input': {
            cursor: disabled ? 'not-allowed' : 'pointer',
            textOverflow: 'ellipsis',
            fontStyle: hasSelection ? 'normal' : 'italic',
            color: hasSelection ? 'text.primary' : 'text.secondary',
          },
          '&.Mui-focused': {
            boxShadow: `0 0 0 3px ${primaryMainAlpha(0.12)}`,
          },
        }}
      />

      <Collapse in={open} unmountOnExit>
        <Box
          role="listbox"
          aria-multiselectable={multiple || undefined}
          sx={{
            ...productPanelSx,
            borderTop: 'none',
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderBottomLeftRadius: 2.5,
            borderBottomRightRadius: 2.5,
            mt: '-1px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {showSearch ? (
            <Box
              sx={{
                p: 1.25,
                borderBottom: '1px solid',
                borderColor: 'divider',
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

          <OptionsScrollArea resetKey={`${open}-${query}-${filtered.length}`}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns:
                  columns === 1 ? '1fr' : columns === 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                gap: 0,
              }}
            >
              {filtered.map((option) => {
                const selected = isSelected(option.value);
                return (
                  <FormControlLabel
                    key={option.value}
                    control={
                      <Checkbox
                        size="small"
                        checked={selected}
                        onChange={() => toggleOption(option.value)}
                      />
                    }
                    label={
                      renderOptionLabel ? (
                        renderOptionLabel(option, selected)
                      ) : (
                        <Typography variant="body2" sx={{ fontWeight: selected ? 600 : 400 }}>
                          {option.label}
                        </Typography>
                      )
                    }
                    sx={{
                      mx: 0,
                      px: 1,
                      py: 0.15,
                      borderRadius: 1.5,
                      alignItems: 'center',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  />
                );
              })}
            </Box>

            {filtered.length === 0 ? (
              <Typography sx={{ px: 1.5, py: 1.25, fontSize: '0.84rem', color: 'text.secondary' }}>
                {t.common.noResults}
              </Typography>
            ) : null}
          </OptionsScrollArea>

          {panelFooter ? (
            <Stack
              spacing={0.5}
              sx={{
                flexShrink: 0,
                borderTop: '1px solid',
                borderColor: 'divider',
                px: 1.25,
                py: 1,
              }}
            >
              {panelFooter}
            </Stack>
          ) : null}
        </Box>
      </Collapse>

      {helperText ? <FormHelperText error={error}>{helperText}</FormHelperText> : null}
    </FormControl>
  );
}
