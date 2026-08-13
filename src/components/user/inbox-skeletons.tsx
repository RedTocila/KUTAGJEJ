'use client';

import * as React from 'react';
import { Box, Divider, Skeleton, Stack } from '@mui/material';

const FILTER_WIDTHS = [88, 104, 96, 112, 110] as const;

/** Pill-shaped placeholders matching ProductTag filter chips. */
export function FilterChipSkeletonRow({
  count = 5,
}: {
  count?: number;
}): React.JSX.Element {
  return (
    <Stack
      direction="row"
      useFlexGap
      spacing={1}
      sx={{ flexWrap: 'wrap' }}
      aria-busy
      aria-label="Duke ngarkuar filtrat"
    >
      {Array.from({ length: count }, (_, i) => (
        <Skeleton
          key={i}
          variant="rounded"
          animation="wave"
          width={FILTER_WIDTHS[i % FILTER_WIDTHS.length]}
          height={36}
          sx={{ borderRadius: 999 }}
        />
      ))}
    </Stack>
  );
}

function NotificationRowSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Stack
      spacing={compact ? 0.45 : 0.65}
      sx={{
        px: compact ? 1.5 : { xs: 1.5, sm: 2 },
        py: compact ? 0.85 : 1.25,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Skeleton variant="text" animation="wave" width="58%" height={compact ? 16 : 20} />
        <Skeleton variant="rounded" animation="wave" width={compact ? 40 : 56} height={compact ? 14 : 18} sx={{ borderRadius: 1 }} />
      </Stack>
      <Skeleton variant="text" animation="wave" width="92%" height={compact ? 14 : 16} />
      {!compact ? <Skeleton variant="text" animation="wave" width="64%" height={16} /> : null}
    </Stack>
  );
}

/** Stacked notification / lead rows. */
export function NotificationRowsSkeleton({
  count = 6,
  compact = false,
}: {
  count?: number;
  compact?: boolean;
}): React.JSX.Element {
  return (
    <Box
      aria-busy
      aria-label="Duke ngarkuar njoftimet"
      sx={(theme) => ({
        borderTop: compact ? 'none' : '1px solid',
        borderBottom: compact ? 'none' : '1px solid',
        borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'divider',
      })}
    >
      {Array.from({ length: count }, (_, i) => (
        <React.Fragment key={i}>
          {i > 0 ? (
            <Divider
              sx={(theme) => ({
                borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'divider',
              })}
            />
          ) : null}
          <NotificationRowSkeleton compact={compact} />
        </React.Fragment>
      ))}
    </Box>
  );
}

/** Full inbox loading state: filter chips + list rows. */
export function NotificationInboxSkeleton({
  filterCount = 5,
  rowCount = 6,
}: {
  filterCount?: number;
  rowCount?: number;
}): React.JSX.Element {
  return (
    <Stack spacing={2.5} aria-busy aria-label="Duke u ngarkuar">
      <FilterChipSkeletonRow count={filterCount} />
      <NotificationRowsSkeleton count={rowCount} />
    </Stack>
  );
}
