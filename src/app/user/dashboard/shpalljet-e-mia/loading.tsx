import * as React from 'react';
import { Box, Grid, Skeleton, Stack } from '@mui/material';

/**
 * Soft-nav placeholder for My listings — mirrors the in-page card grid skeletons.
 */
export default function Loading(): React.JSX.Element {
  return (
    <Stack spacing={2.5} aria-busy aria-label="Duke ngarkuar shpalljet">
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Skeleton variant="rounded" animation="wave" width={44} height={44} sx={{ borderRadius: 2.25 }} />
        <Stack spacing={0.75} sx={{ flex: 1 }}>
          <Skeleton variant="text" animation="wave" width={200} height={32} />
          <Skeleton variant="text" animation="wave" width={260} height={18} />
        </Stack>
        <Skeleton variant="circular" animation="wave" width={36} height={36} />
      </Stack>
      <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }}>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            animation="wave"
            width={100}
            height={36}
            sx={{ borderRadius: 999 }}
          />
        ))}
      </Stack>
      <Grid container spacing={2}>
        {Array.from({ length: 6 }, (_, i) => (
          <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}>
            <Box>
              <Skeleton variant="rounded" animation="wave" height={220} sx={{ borderRadius: 2.5 }} />
            </Box>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
