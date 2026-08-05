'use client';

import * as React from 'react';
import {
  Box,
  ClickAwayListener,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Paper,
  Popper,
  Typography,
  type FormControlProps,
} from '@mui/material';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CaretLeft as CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';

import { primaryMainAlpha } from '@/lib/css-var-alpha';
import {
  formatReservationDateLabel,
  parseLocalIsoDate,
  reservationDateBounds,
  toLocalIsoDate,
} from '@/lib/business-listing-detail-content';

const WEEKDAY_LABELS = Array.from({ length: 7 }, (_, i) => {
  // Monday-first week (sq-AL often starts Mon). Use a fixed week in Jan 2024.
  const d = new Date(2024, 0, 1 + i); // Mon=1 … Sun=7
  return d.toLocaleDateString('sq-AL', { weekday: 'narrow' });
});

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Monday = 0 … Sunday = 6 */
function mondayBasedWeekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function ReservationDateField({
  label = 'Data',
  value,
  onChange,
  emptyLabel = 'Zgjidhni datën…',
  size = 'small',
  fullWidth = true,
  disabled = false,
  id,
  sx,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  emptyLabel?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  disabled?: boolean;
  id?: string;
  sx?: FormControlProps['sx'];
}) {
  const fieldId = id ?? 'reservation-date-field';
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const bounds = React.useMemo(() => reservationDateBounds(), []);
  const minDate = React.useMemo(() => parseLocalIsoDate(bounds.min)!, [bounds.min]);
  const maxDate = React.useMemo(() => parseLocalIsoDate(bounds.max)!, [bounds.max]);

  const displayLabel = value ? formatReservationDateLabel(value) : '';

  const [viewMonth, setViewMonth] = React.useState(() =>
    startOfMonth(parseLocalIsoDate(value) ?? minDate)
  );

  React.useEffect(() => {
    if (open) {
      setViewMonth(startOfMonth(parseLocalIsoDate(value) ?? minDate));
    }
  }, [open, value, minDate]);

  const close = () => setOpen(false);

  const handleToggle = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
  };

  const canGoPrev = addMonths(viewMonth, -1) >= startOfMonth(minDate);
  const canGoNext = addMonths(viewMonth, 1) <= startOfMonth(maxDate);

  const cells = React.useMemo(() => {
    const total = daysInMonth(viewMonth);
    const offset = mondayBasedWeekday(viewMonth);
    const out: ({ iso: string; day: number; disabled: boolean } | null)[] = [];
    for (let i = 0; i < offset; i += 1) out.push(null);
    for (let day = 1; day <= total; day += 1) {
      const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
      const iso = toLocalIsoDate(d);
      const disabledDay = d < minDate || d > maxDate;
      out.push({ iso, day, disabled: disabledDay });
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [viewMonth, minDate, maxDate]);

  const monthTitle = viewMonth.toLocaleDateString('sq-AL', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <ClickAwayListener onClickAway={close}>
      <FormControl fullWidth={fullWidth} size={size} disabled={disabled} sx={sx}>
        <InputLabel id={`${fieldId}-label`} shrink sx={{ fontWeight: 600 }}>
          {label}
        </InputLabel>
        <OutlinedInput
          id={fieldId}
          ref={anchorRef}
          label={label}
          readOnly
          notched
          value={displayLabel}
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
            }
          }}
          endAdornment={
            <InputAdornment position="end" sx={{ ml: 0 }}>
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
          sx={{
            zIndex: 1600,
            width: Math.max(anchorRef.current?.offsetWidth ?? 280, 280),
          }}
          modifiers={[{ name: 'preventOverflow', options: { padding: 8 } }]}
        >
          <Paper
            elevation={8}
            sx={{
              mt: 0.5,
              p: 1.25,
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1,
                px: 0.25,
              }}
            >
              <IconButton
                size="small"
                aria-label="Muaji i kaluar"
                disabled={!canGoPrev}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setViewMonth((m) => addMonths(m, -1))}
              >
                <CaretLeftIcon size={16} weight="bold" />
              </IconButton>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'capitalize' }}>
                {monthTitle}
              </Typography>
              <IconButton
                size="small"
                aria-label="Muaji i ardhshëm"
                disabled={!canGoNext}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
              >
                <CaretRightIcon size={16} weight="bold" />
              </IconButton>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 0.25,
                mb: 0.5,
              }}
            >
              {WEEKDAY_LABELS.map((w, i) => (
                <Typography
                  key={i}
                  component="span"
                  sx={{
                    textAlign: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: 'text.secondary',
                    py: 0.25,
                    textTransform: 'uppercase',
                  }}
                >
                  {w}
                </Typography>
              ))}
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 0.25,
              }}
            >
              {cells.map((cell, i) => {
                if (!cell) {
                  return <Box key={`e-${i}`} sx={{ aspectRatio: '1', minHeight: 36 }} />;
                }
                const isSelected = cell.iso === value;
                const isToday = cell.iso === bounds.min;
                return (
                  <Box
                    key={cell.iso}
                    component="button"
                    type="button"
                    disabled={cell.disabled}
                    aria-label={cell.iso}
                    aria-pressed={isSelected}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (cell.disabled) return;
                      onChange(cell.iso);
                      close();
                    }}
                    sx={{
                      aspectRatio: '1',
                      minHeight: 36,
                      border: 'none',
                      borderRadius: 1.5,
                      cursor: cell.disabled ? 'default' : 'pointer',
                      bgcolor: isSelected ? 'primary.main' : 'transparent',
                      color: isSelected
                        ? 'primary.contrastText'
                        : cell.disabled
                          ? 'text.disabled'
                          : 'text.primary',
                      fontWeight: isSelected || isToday ? 700 : 500,
                      fontSize: '0.8125rem',
                      fontFamily: 'inherit',
                      outline: isToday && !isSelected ? '1px solid' : 'none',
                      outlineColor: 'primary.main',
                      outlineOffset: -1,
                      transition: 'background-color 0.12s ease',
                      '&:hover:not(:disabled)': {
                        bgcolor: isSelected ? 'primary.main' : primaryMainAlpha(0.12),
                      },
                      '&:disabled': {
                        opacity: 0.35,
                      },
                    }}
                  >
                    {cell.day}
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Popper>
      </FormControl>
    </ClickAwayListener>
  );
}
