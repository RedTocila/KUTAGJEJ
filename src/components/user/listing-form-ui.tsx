'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  type ButtonProps,
  type SxProps,
  type Theme,
  type TextFieldProps,
} from '@mui/material';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import { PortalIconBox } from '@/components/user/portal-cards';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { productButtonSx, productFieldSx } from '@/styles/product-sx';

/** Shared outlined field chrome — matches `SearchableSelect`. */
export const listingOutlinedFieldSx = productFieldSx;

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

export function ListingFormSection({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        borderRadius: 2.75,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: (t) =>
          t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        spacing={1.25}
        sx={{
          alignItems: 'flex-start',
          px: { xs: 1.75, sm: 2.25 },
          pt: { xs: 1.75, sm: 2 },
          pb: 1.5,
        }}
      >
        {icon ? <PortalIconBox size={36}>{icon}</PortalIconBox> : null}
        <Box sx={{ minWidth: 0, flex: 1, pt: 0.15 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: '0.98rem', letterSpacing: '-0.01em' }}>
              {title}
            </Typography>
            {action}
          </Stack>
          {description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35, lineHeight: 1.4 }}>
              {description}
            </Typography>
          ) : null}
        </Box>
      </Stack>
      <Box sx={{ px: { xs: 1.75, sm: 2.25 }, pb: { xs: 1.75, sm: 2.25 } }}>
        <Stack spacing={1.75}>{children}</Stack>
      </Box>
    </Box>
  );
}

const submitButtonSx = {
  ...productButtonSx,
  px: 3,
  minHeight: 48,
  width: { xs: '100%', sm: 'auto' },
} as const;

export function ListingFormActions({
  submitLabel,
  submitting = false,
  disabled = false,
  backHref,
  backLabel = 'Kthehu',
  submitProps,
  sx,
}: {
  submitLabel: string;
  submitting?: boolean;
  disabled?: boolean;
  backHref?: string;
  backLabel?: string;
  submitProps?: Omit<ButtonProps, 'type' | 'variant' | 'disabled' | 'children' | 'sx'>;
  sx?: SxProps<Theme>;
}) {
  return (
    <Stack
      direction={{ xs: 'column-reverse', sm: 'row' }}
      spacing={1.5}
      sx={[
        { justifyContent: 'flex-end', pt: 0.5 },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {backHref ? (
        <Button
          component={RouterLink}
          href={backHref}
          color="inherit"
          variant="outlined"
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
  );
}

/** Two-/few-option segmented toggle (currency, transmission, etc.). */
export function ListingToggle({
  label,
  value,
  onChange,
  options,
  required,
  error,
  helperText,
  fullWidth = true,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string; Icon?: PhosphorIcon }>;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
}) {
  return (
    <Box sx={{ width: fullWidth ? '100%' : 'auto', minWidth: fullWidth ? undefined : 160 }}>
      {/* fieldset + legend matches outlined TextField height/label so row layouts align */}
      <Box
        component="fieldset"
        sx={{
          m: 0,
          p: 0,
          minInlineSize: 0,
          borderRadius: 2.5,
          border: '1.5px solid',
          borderColor: error ? 'error.main' : value ? 'primary.main' : 'divider',
          bgcolor: value ? primaryMainAlpha(0.06) : 'background.paper',
          boxShadow: value ? `inset 0 0 0 1px ${primaryMainAlpha(0.1)}` : 'none',
          transition: 'border-color 0.15s, background-color 0.15s, box-shadow 0.15s',
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
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background-color 0.15s, color 0.15s, box-shadow 0.15s',
                  boxShadow: active ? `0 3px 12px ${primaryMainAlpha(0.35)}` : 'none',
                  '&:hover': {
                    bgcolor: active ? 'primary.main' : primaryMainAlpha(0.1),
                    color: active ? 'primary.contrastText' : 'text.primary',
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

