import * as React from 'react';
import { Box, Grid, Skeleton, Stack } from '@mui/material';

/** Package checkout / offer rows (Boost Coins, plans, extras). */
export function PackageRowsSkeleton({
  count = 5,
  rowHeight = 76,
}: {
  count?: number;
  rowHeight?: number;
}): React.JSX.Element {
  return (
    <Stack spacing={1.25} aria-busy aria-label="Duke u ngarkuar">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton
          key={i}
          variant="rounded"
          animation="wave"
          height={rowHeight}
          sx={{ borderRadius: 2.5, width: '100%' }}
        />
      ))}
    </Stack>
  );
}

/** Generic stacked content blocks for dashboard sections. */
export function ContentBlockSkeleton({
  rows = 4,
  rowHeight = 88,
}: {
  rows?: number;
  rowHeight?: number;
}): React.JSX.Element {
  return (
    <Stack spacing={1.5} aria-busy aria-label="Duke u ngarkuar">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton
          key={i}
          variant="rounded"
          animation="wave"
          height={rowHeight}
          sx={{ borderRadius: 2.5, width: '100%' }}
        />
      ))}
    </Stack>
  );
}

/** Compact list rows (pickers, dialogs, payment history). */
export function ListRowsSkeleton({
  count = 6,
  rowHeight = 56,
}: {
  count?: number;
  rowHeight?: number;
}): React.JSX.Element {
  return (
    <Stack spacing={1} aria-busy aria-label="Duke u ngarkuar">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton
          key={i}
          variant="rounded"
          animation="wave"
          height={rowHeight}
          sx={{ borderRadius: 2, width: '100%' }}
        />
      ))}
    </Stack>
  );
}

/** Stats summary + list used on statistics / similar pages. */
export function StatsPageSkeleton(): React.JSX.Element {
  return (
    <Stack spacing={2} aria-busy aria-label="Duke u ngarkuar">
      <Grid container spacing={{ xs: 1, sm: 1.5 }}>
        {Array.from({ length: 3 }, (_, i) => (
          <Grid key={i} size={4}>
            <Skeleton variant="rounded" animation="wave" height={92} sx={{ borderRadius: 2.5 }} />
          </Grid>
        ))}
      </Grid>
      <Skeleton variant="rounded" animation="wave" height={220} sx={{ borderRadius: 2.5 }} />
      <ListRowsSkeleton count={4} rowHeight={64} />
    </Stack>
  );
}

/** Checkout / form-style page placeholder. */
export function CheckoutSkeleton(): React.JSX.Element {
  return (
    <Stack spacing={2} sx={{ maxWidth: 560, mx: 'auto', width: '100%' }} aria-busy aria-label="Duke u ngarkuar">
      <Skeleton variant="text" animation="wave" width="55%" height={36} />
      <Skeleton variant="rounded" animation="wave" height={120} sx={{ borderRadius: 2.5 }} />
      <Skeleton variant="rounded" animation="wave" height={56} sx={{ borderRadius: 2 }} />
      <Skeleton variant="rounded" animation="wave" height={56} sx={{ borderRadius: 2 }} />
      <Skeleton variant="rounded" animation="wave" height={48} sx={{ borderRadius: 2 }} />
    </Stack>
  );
}

/** Listing card grid (browse load-more / search results). */
export function ListingCardsSkeleton({
  count = 4,
  columns = 1,
}: {
  count?: number;
  columns?: 1 | 2;
}): React.JSX.Element {
  const xsSize = columns === 2 ? 6 : 12;
  return (
    <Grid container spacing={columns === 2 ? { xs: 1.25, sm: 2, md: 2.5 } : { xs: 2, md: 2.5 }} aria-busy aria-label="Duke u ngarkuar">
      {Array.from({ length: count }, (_, i) => (
        <Grid key={i} size={{ xs: xsSize, sm: 6, md: 4, lg: 3 }}>
          <Stack spacing={1.25}>
            <Skeleton
              variant="rounded"
              animation="wave"
              sx={{ width: '100%', aspectRatio: columns === 2 ? '4 / 3' : '16 / 10', borderRadius: 2 }}
            />
            <Skeleton variant="text" animation="wave" width="70%" />
            <Skeleton variant="text" animation="wave" width="45%" />
          </Stack>
        </Grid>
      ))}
    </Grid>
  );
}

/** Centered full-viewport shell (auth gate). */
export function FullPageSkeleton(): React.JSX.Element {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 720,
        px: 2,
        py: 4,
      }}
      aria-busy
      aria-label="Duke u ngarkuar"
    >
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Skeleton variant="rounded" animation="wave" width={44} height={44} sx={{ borderRadius: 2.25 }} />
          <Stack spacing={0.75} sx={{ flex: 1 }}>
            <Skeleton variant="text" animation="wave" width="40%" height={32} />
            <Skeleton variant="text" animation="wave" width="60%" height={20} />
          </Stack>
        </Stack>
        <ContentBlockSkeleton rows={4} rowHeight={72} />
      </Stack>
    </Box>
  );
}
