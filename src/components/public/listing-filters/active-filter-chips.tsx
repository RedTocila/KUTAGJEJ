'use client';

import * as React from 'react';
import { Box, Chip } from '@mui/material';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { primaryMainAlpha } from '@/lib/css-var-alpha';
import type { ActiveFilterChip } from '@/lib/listing-filters';

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
          <Chip
            key={chip.key}
            label={chip.label}
            size="small"
            onDelete={() => onRemove(chip.key)}
            deleteIcon={<XIcon size={12} />}
            sx={{
              flexShrink: 0,
              height: 28,
              fontWeight: 600,
              fontSize: '0.78rem',
              borderRadius: 999,
              bgcolor: primaryMainAlpha(0.08),
              color: 'primary.main',
              border: '1px solid',
              borderColor: primaryMainAlpha(0.2),
              '& .MuiChip-deleteIcon': {
                color: 'primary.main',
                opacity: 0.7,
                '&:hover': { opacity: 1 },
              },
            }}
          />
        ))}
        {chips.length > 1 ? (
          <Chip
            label="Pastro të gjitha"
            size="small"
            variant="outlined"
            onClick={onClearAll}
            sx={{
              flexShrink: 0,
              height: 28,
              fontWeight: 600,
              fontSize: '0.78rem',
              borderRadius: 999,
              borderColor: 'divider',
            }}
          />
        ) : null}
      </Box>
    </Box>
  );
}
