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
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        maskImage: 'linear-gradient(to right, black 0, black calc(100% - 20px), transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, black 0, black calc(100% - 20px), transparent 100%)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'nowrap', pr: 2.5, py: 0.25 }}>
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
    </Box>
  );
}
