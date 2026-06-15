'use client';

import * as React from 'react';
import {
  Box,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { SearchableSelect } from '@/components/core/searchable-select';
import { primaryMainAlpha } from '@/lib/css-var-alpha';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2.5,
    bgcolor: 'background.paper',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    '&.Mui-focused': {
      boxShadow: `0 0 0 3px ${primaryMainAlpha(0.12)}`,
    },
  },
} as const;

export function FilterSection({
  title,
  children,
  index = 0,
}: {
  title: string;
  children: React.ReactNode;
  index?: number;
}) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        position: 'relative',
        overflow: 'hidden',
        animation: 'filterSectionIn 0.45s ease both',
        animationDelay: `${index * 0.07}s`,
        '@keyframes filterSectionIn': {
          from: { opacity: 0, transform: 'translateX(-12px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${primaryMainAlpha(0.7)}, transparent)`,
        },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            boxShadow: `0 0 10px ${primaryMainAlpha(0.6)}`,
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'text.secondary',
            fontSize: '0.7rem',
          }}
        >
          {title}
        </Typography>
      </Stack>
      <Grid container spacing={1.5}>
        {children}
      </Grid>
    </Box>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  emptyLabel = 'Të gjitha',
  gridSize = { xs: 12 },
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  emptyLabel?: string;
  gridSize?: { xs?: number; sm?: number; md?: number; lg?: number };
}) {
  return (
    <Grid size={gridSize}>
      <SearchableSelect
        label={label}
        value={value}
        onChange={onChange}
        options={options}
        emptyLabel={emptyLabel}
        sx={fieldSx}
      />
    </Grid>
  );
}

export function FilterNumberField({
  label,
  value,
  onChange,
  gridSize = { xs: 12, sm: 6 },
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  gridSize?: { xs?: number; sm?: number; md?: number; lg?: number };
}) {
  return (
    <Grid size={gridSize}>
      <TextField
        size="small"
        fullWidth
        label={label}
        type="number"
        slotProps={{ htmlInput: { min: 0 } }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={fieldSx}
      />
    </Grid>
  );
}

export function FilterTextField({
  label,
  value,
  onChange,
  placeholder,
  gridSize = { xs: 12 },
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  gridSize?: { xs?: number; sm?: number; md?: number; lg?: number };
}) {
  return (
    <Grid size={gridSize}>
      <TextField
        size="small"
        fullWidth
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={fieldSx}
      />
    </Grid>
  );
}

export function PriceRangeFields({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: {
  minValue: string;
  maxValue: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
}) {
  return (
    <Grid size={{ xs: 12 }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <TextField
          size="small"
          fullWidth
          label="Çmimi min"
          type="number"
          slotProps={{ htmlInput: { min: 0 } }}
          value={minValue}
          onChange={(e) => onMinChange(e.target.value)}
          sx={fieldSx}
        />
        <Box
          sx={{
            width: 28,
            height: 2,
            borderRadius: 1,
            bgcolor: primaryMainAlpha(0.35),
            flexShrink: 0,
          }}
        />
        <TextField
          size="small"
          fullWidth
          label="Çmimi max"
          type="number"
          slotProps={{ htmlInput: { min: 0 } }}
          value={maxValue}
          onChange={(e) => onMaxChange(e.target.value)}
          sx={fieldSx}
        />
      </Stack>
    </Grid>
  );
}
