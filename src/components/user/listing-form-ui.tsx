'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  type ButtonProps,
  type SxProps,
  type Theme,
  type TextFieldProps,
} from '@mui/material';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';

import { PortalIconBox } from '@/components/user/portal-cards';
import { useCopy } from '@/hooks/use-copy';
import { useHistoryBackProps } from '@/hooks/use-navigate-back';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import {
  AI_SEARCH_BLUE,
  AI_SEARCH_BLUE_HOVER,
  AI_SEARCH_BLUE_ON,
} from '@/lib/home-categories';
import { focusPostListingAiAssist } from '@/lib/post-listing-ai-focus';
import { paths } from '@/paths';
import { productButtonSx, productFieldSx } from '@/styles/product-sx';

/** Shared outlined field chrome — matches `SearchableSelect`. */
export const listingOutlinedFieldSx = productFieldSx;

function ListingFormActionAlert({
  message,
  severity,
}: {
  message?: string | null;
  severity: 'error' | 'success';
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (message) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [message]);

  if (!message) return null;

  return (
    <Alert
      ref={ref}
      severity={severity}
      sx={{ borderRadius: 1.5 }}
      role={severity === 'error' ? 'alert' : 'status'}
    >
      {message}
    </Alert>
  );
}

/** Validation / submit error shown next to the form action buttons (not at the top). */
export function ListingFormActionError({ error }: { error?: string | null }) {
  return <ListingFormActionAlert message={error} severity="error" />;
}

/**
 * Text field with always-floating label + shared radius/focus so it matches
 * `SearchableSelect` and other listing inputs.
 */
export const ListingTextField = React.forwardRef(function ListingTextField(
  props: TextFieldProps,
  ref: React.Ref<HTMLDivElement>,
) {
  const { slotProps, sx, ...rest } = props;
  const inputLabelSlot =
    typeof slotProps?.inputLabel === 'object' && slotProps.inputLabel !== null
      ? slotProps.inputLabel
      : {};

  return (
    <TextField
      ref={ref}
      {...rest}
      slotProps={{
        ...slotProps,
        inputLabel: {
          ...inputLabelSlot,
          shrink: true,
        },
      }}
      sx={[listingOutlinedFieldSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    />
  );
});

/**
 * Listing description textarea with an AI button in the bottom-right corner.
 * The button opens the listing AI drawer and focuses the input (opens the keyboard).
 * Overflow is hidden so iOS does not trap vertical pans inside the field.
 */
const DESCRIPTION_MIN_ROWS = 4;

function autosizeTextarea(el: HTMLTextAreaElement | null, minRows = DESCRIPTION_MIN_ROWS) {
  if (!el) return;
  el.style.overflow = 'hidden';
  const lineHeight = Number.parseFloat(window.getComputedStyle(el).lineHeight);
  const minHeight = (Number.isFinite(lineHeight) ? lineHeight : 23) * minRows;
  el.style.height = 'auto';
  el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`;
}

export const ListingDescriptionField = React.forwardRef(function ListingDescriptionField(
  props: TextFieldProps,
  ref: React.Ref<HTMLDivElement>,
) {
  const t = useCopy();
  const { slotProps, sx, multiline = true, minRows: minRowsProp, inputRef, onChange, ...rest } = props;
  const minRows = Math.max(DESCRIPTION_MIN_ROWS, Number(minRowsProp) || 0);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const inputSlot =
    typeof slotProps?.input === 'object' && slotProps.input !== null ? slotProps.input : {};
  const inputSlotSx = 'sx' in inputSlot ? inputSlot.sx : undefined;
  const existingEndAdornment =
    'endAdornment' in inputSlot ? inputSlot.endAdornment : undefined;

  const setTextareaRef = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;
      autosizeTextarea(node, minRows);
      if (typeof inputRef === 'function') inputRef(node);
      else if (inputRef) (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
    },
    [inputRef, minRows],
  );

  React.useLayoutEffect(() => {
    autosizeTextarea(textareaRef.current, minRows);
  }, [minRows, rest.value, rest.defaultValue]);

  return (
    <ListingTextField
      ref={ref}
      {...rest}
      multiline={multiline}
      minRows={minRows}
      inputRef={setTextareaRef}
      onChange={(event) => {
        autosizeTextarea(event.target as HTMLTextAreaElement, minRows);
        onChange?.(event);
      }}
      slotProps={{
        ...slotProps,
        input: {
          ...inputSlot,
          endAdornment: (
            <>
              {existingEndAdornment}
              <InputAdornment position="end" sx={{ pointerEvents: 'none' }}>
                <IconButton
                  type="button"
                  size="small"
                  aria-label={t.aiImport.writeWithAi}
                  onClick={focusPostListingAiAssist}
                  sx={{
                    pointerEvents: 'auto',
                    width: 32,
                    height: 32,
                    bgcolor: AI_SEARCH_BLUE,
                    color: AI_SEARCH_BLUE_ON,
                    '&:hover': {
                      bgcolor: AI_SEARCH_BLUE_HOVER,
                      color: AI_SEARCH_BLUE_ON,
                    },
                  }}
                >
                  <SparkleIcon size={16} weight="bold" />
                </IconButton>
              </InputAdornment>
            </>
          ),
          sx: [
            {
              alignItems: 'stretch',
              position: 'relative',
              minHeight: 136,
              '& textarea': {
                overflow: 'hidden !important',
                overscrollBehavior: 'none',
                minHeight: `calc(1.4375em * ${minRows}) !important`,
              },
              '& .MuiInputAdornment-positionEnd': {
                position: 'absolute',
                right: 8,
                bottom: 8,
                maxHeight: 'none',
                height: 'auto',
                margin: 0,
              },
            },
            ...(Array.isArray(inputSlotSx) ? inputSlotSx : inputSlotSx ? [inputSlotSx] : []),
          ],
        },
      }}
      sx={[
        {
          '& .MuiOutlinedInput-root': {
            minHeight: 136,
            alignItems: 'stretch',
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  );
});

export function ListingFormSection({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const showHeader = Boolean(icon || title || description || action);
  return (
    <Stack spacing={1.75}>
      {showHeader ? (
        <Stack
          direction="row"
          spacing={1.25}
          sx={{ alignItems: description ? 'flex-start' : 'center' }}
        >
          {icon ? <PortalIconBox size={36}>{icon}</PortalIconBox> : null}
          <Box sx={{ minWidth: 0, flex: 1, pt: description ? 0.15 : 0 }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
            >
              {title ? (
                <Typography sx={{ fontWeight: 800, fontSize: '0.98rem', letterSpacing: '-0.01em' }}>
                  {title}
                </Typography>
              ) : (
                <Box sx={{ flex: 1 }} />
              )}
              {action}
            </Stack>
            {description ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35, lineHeight: 1.4 }}>
                {description}
              </Typography>
            ) : null}
          </Box>
        </Stack>
      ) : null}
      <Stack spacing={1.75}>{children}</Stack>
    </Stack>
  );
}

const submitButtonSx = {
  ...productButtonSx,
  px: 3,
  minHeight: 48,
  width: { xs: '100%', sm: 'auto' },
  borderRadius: 999,
} as const;

export function ListingFormActions({
  submitLabel,
  submitting = false,
  disabled = false,
  backHref,
  backLabel = 'Kthehu',
  submitProps,
  error,
  success,
  sx,
}: {
  submitLabel: string;
  submitting?: boolean;
  disabled?: boolean;
  backHref?: string;
  backLabel?: string;
  submitProps?: Omit<ButtonProps, 'type' | 'variant' | 'disabled' | 'children' | 'sx'>;
  /** Shown above the buttons so missing-field errors stay visible at the footer. */
  error?: string | null;
  /** Shown above the buttons after a successful save. */
  success?: string | null;
  sx?: SxProps<Theme>;
}) {
  const historyBack = useHistoryBackProps(backHref ?? paths.user.dashboard);
  return (
    <Stack
      spacing={1.25}
      sx={[
        { pt: 0.5 },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <ListingFormActionError error={error} />
      <ListingFormActionAlert message={success} severity="success" />
      <Stack
        direction={{ xs: 'column-reverse', sm: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'flex-end' }}
      >
        {backHref ? (
          <Button
            component={RouterLink}
            color="inherit"
            variant="outlined"
            {...historyBack}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2.25,
              minHeight: 48,
              borderColor: 'divider',
            }}
          >
            {backLabel}
          </Button>
        ) : null}
        <Button
          type="submit"
          variant="contained"
          disabled={disabled || submitting}
          {...submitProps}
          sx={submitButtonSx}
        >
          {submitting ? 'Duke ruajtur…' : submitLabel}
        </Button>
      </Stack>
    </Stack>
  );
}

/** Two-/few-option segmented toggle (currency, transaction type, transmission). */
export function ListingToggle({
  label,
  value,
  onChange,
  options,
  required,
  error,
  helperText,
  fullWidth = true,
  disabled = false,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string; Icon?: PhosphorIcon }>;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}) {
  return (
    <Box sx={{ width: fullWidth ? '100%' : 'auto', minWidth: fullWidth ? undefined : 160 }}>
      {/* fieldset + legend matches outlined TextField height/label so row layouts align */}
      <Box
        component="fieldset"
        disabled={disabled}
        sx={{
          m: 0,
          p: 0,
          minInlineSize: 0,
          borderRadius: 2.5,
          border: '1.5px solid',
          borderColor: error ? 'error.main' : value ? 'primary.main' : 'divider',
          bgcolor: value ? primaryMainAlpha(0.06) : 'background.paper',
          boxShadow: value ? `inset 0 0 0 1px ${primaryMainAlpha(0.1)}` : 'none',
          opacity: disabled ? 0.55 : 1,
          transition: 'border-color 0.15s, background-color 0.15s, box-shadow 0.15s, opacity 0.15s',
        }}
      >
        {label ? (
          <Typography
            component="legend"
            sx={{
              px: 0.5,
              ml: 1,
              float: 'unset',
              width: 'auto',
              fontWeight: 600,
              fontSize: '0.75rem',
              lineHeight: 1,
              color: error ? 'error.main' : value ? 'primary.main' : 'text.secondary',
            }}
          >
            {label}
            {required ? ' *' : ''}
          </Typography>
        ) : null}
        <Box
          role="radiogroup"
          aria-label={label}
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${options.length}, 1fr)`,
            gap: 0.5,
            p: 0.5,
            minHeight: 48,
          }}
        >
          {options.map((opt) => {
            const active = value === opt.value;
            const Icon = opt.Icon;
            return (
              <Box
                key={opt.value}
                component="button"
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => onChange(opt.value)}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.65,
                  minHeight: 42,
                  px: 1.25,
                  borderRadius: 2,
                  border: 'none',
                  bgcolor: active ? 'primary.main' : 'transparent',
                  color: active ? 'primary.contrastText' : 'text.secondary',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: disabled ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background-color 0.15s, color 0.15s, box-shadow 0.15s',
                  boxShadow: active ? `0 3px 12px ${primaryMainAlpha(0.35)}` : 'none',
                  '&:not(:disabled):hover': {
                    bgcolor: active ? 'primary.main' : primaryMainAlpha(0.1),
                    color: active ? 'primary.contrastText' : 'text.primary',
                  },
                  '&:disabled': {
                    color: active ? 'primary.contrastText' : 'text.secondary',
                  },
                }}
              >
                {Icon ? <Icon size={16} weight={active ? 'fill' : 'duotone'} /> : null}
                {opt.label}
              </Box>
            );
          })}
        </Box>
      </Box>
      {helperText ? (
        <Typography variant="caption" color={error ? 'error' : 'text.secondary'} sx={{ mt: 0.5, display: 'block' }}>
          {helperText}
        </Typography>
      ) : null}
    </Box>
  );
}

