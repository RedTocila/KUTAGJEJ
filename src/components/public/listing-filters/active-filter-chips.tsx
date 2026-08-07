'use client';

import * as React from 'react';
import { Box } from '@mui/material';

import type { ActiveFilterChip } from '@/lib/listing-filters';
import { ProductTag } from '@/components/public/product-browse-chrome';

export function ActiveFilterChips({
  chips,
  onRemove,
  onClearAll,
}: {
  chips: ActiveFilterChip[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}) {
  if (chips.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 0.75,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        py: 0.25,
      }}
    >
      {chips.map((chip) => (
        <ProductTag
          key={chip.key}
          label={chip.label}
          active
          onDelete={() => onRemove(chip.key)}
        />
      ))}
      {chips.length > 1 ? (
        <ProductTag label="Pastro të gjitha" onClick={onClearAll} />
      ) : null}
    </Box>
  );
}
